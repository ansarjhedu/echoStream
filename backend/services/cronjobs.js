import cron from 'node-cron';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js'; 
import User from '../models/User.js';

// We wrap it in a function so index.js can control exactly when it starts!
const startCronJobs = () => {
    console.log("⏳ Cron Jobs Initialized: Background workers are ready.");

    // This runs automatically every day at midnight ('0 0 * * *')
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('🧹 Running daily cleanup job...');
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // ==========================================
            // 1. CLEAN UP EXPIRED STORES
            // ==========================================
            const expiredStores = await Store.find({ 
                isDeleted: true, 
                deletedAt: { $lte: thirtyDaysAgo } 
            }).select('_id');

            if (expiredStores.length > 0) {
                const storeIds = expiredStores.map(store => store._id);
                console.log(`🗑️ Permanently deleting ${storeIds.length} expired stores and their data...`);

                // CASCADE DELETE: Wipe all children belonging to these stores!
                await Review.deleteMany({ store: { $in: storeIds } });
                await Product.deleteMany({ store: { $in: storeIds } });
                await Store.deleteMany({ _id: { $in: storeIds } });
            }

            // ==========================================
            // 2. CLEAN UP EXPIRED USERS & UNVERIFIED GHOSTS
            // ==========================================
            const expiredUsers = await User.find({ 
                isDeleted: true, 
                deletedAt: { $lte: thirtyDaysAgo } 
            }).select('_id');

            if (expiredUsers.length > 0) {
                const userIds = expiredUsers.map(user => user._id);
                console.log(`🗑️ Permanently deleting ${userIds.length} expired users...`);
                await User.deleteMany({ _id: { $in: userIds } });
            }

            // 🚨 THIS IS NOW INSIDE THE TRY BLOCK 🚨
            const abandonedUsers = await User.deleteMany({
                isVerified: false,
                otpExpire: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24 hours
            });

            if (abandonedUsers.deletedCount > 0) {
                console.log(`🧹 Cleaned up ${abandonedUsers.deletedCount} unverified ghost accounts.`);
            }

            // ==========================================
            // 3. CLEAN UP INDIVIDUAL EXPIRED PRODUCTS & REVIEWS
            // ==========================================
            await Review.deleteMany({ isDeleted: true, deletedAt: { $lte: thirtyDaysAgo } });
            await Product.deleteMany({ isDeleted: true, deletedAt: { $lte: thirtyDaysAgo } });

            console.log('✨ Daily cleanup job completed successfully.');
        } catch (error) {
            console.error('❌ Error occurred while running daily cleanup job:', error);
        }
    });
};

export default startCronJobs;