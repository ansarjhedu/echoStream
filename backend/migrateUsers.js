import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js"; // Adjust the path if your models folder is somewhere else

// 1. Load the environment variables from your .env file
dotenv.config();
import dns from "dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);

const runMigration = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing in your .env file!");
        }

        // 2. Connect directly to MongoDB
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected successfully!");

        // 3. Run the Bulk Update
        console.log("🛠️ Starting bulk update for all users...");
        const result = await User.updateMany(
            {}, // Empty object means "Select ALL users"
            { 
                $set: { 
                    isVerified: true, 
                    isDeleted: false, 
                    isActive: true 
                } 
            }
        );

        // 4. Report the results
        console.log("🎉 Bulk update complete!");
        console.log(`➡️  Users Found: ${result.matchedCount}`);
        console.log(`➡️  Users Updated: ${result.modifiedCount}`);

    } catch (error) {
        console.error("❌ Error during migration:", error);
    } finally {
        // 5. Close the database connection safely so your terminal doesn't hang
        console.log("🔌 Closing database connection...");
        await mongoose.disconnect();
        process.exit(0);
    }
};

// Execute the function
runMigration();