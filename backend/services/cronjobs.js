import cron from 'node-cron';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js'; // <-- Added Store
import User from '../models/User.js';

const cleanupCron = cron.schedule('0 0 * * *', async () => {
    try {
        console.log('Running daily cleanup job...');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Hard delete all entities marked as deleted more than 30 days ago
        await Review.deleteMany({ isDeleted: true, deletedAt: { $lte: thirtyDaysAgo } });
        await Product.deleteMany({ isDeleted: true, deletedAt: { $lte: thirtyDaysAgo } });
        await Store.deleteMany({ isDeleted: true, deletedAt: { $lte: thirtyDaysAgo } }); // <-- Added Store
        await User.deleteMany({ isDeleted: true, deletedAt: { $lte: thirtyDaysAgo } });
        
        console.log('Daily cleanup job completed successfully.');
    } catch (error) {
        console.error('Error occurred while running daily cleanup job:', error);
    }
});
export default cleanupCron;