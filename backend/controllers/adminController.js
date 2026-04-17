import User from "../models/User.js";
import Store from "../models/Store.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";
import crypto from "crypto";

const listUsers=async(req,res)=>{

    try {
        const allUsers= await User.find({role:"owner"}).sort({createdAt:-1});
       
        if(!allUsers || allUsers.length===0){
            return res.status(404).json("Unable to find any user")
        }
        return res.status(200).json({
            data:allUsers,
            message:"Users listed successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
    
}

const deleteUser=async(req,res)=>{
    try {
        const userId=req.params.id;

       const deletedUser=await User.findByIdAndUpdate(userId,
        {
            isDeleted:true,
            deletedAt:Date.now(),
            isActive:false
        },
        {new:true}
       );
       if(!deletedUser){
        return res.status(500).json("Error while deleting user")
       }
       const userStores=await Store.find({owner:userId});
            //soft delete all stores of this user
        await Store.updateMany({owner:userId},{$set:{isDeleted:true, deletedAt:Date.now(), status:"deleted", isActive:false}});
            //soft delete all products of this user
        await Product.updateMany({owner:userId},{$set:{isDeleted:true, deletedAt:Date.now()}});
            //soft delete all reviews of this user
        await Review.updateMany({owner:userId},{$set:{isDeleted:true, deletedAt:Date.now()}});
        
         return res.status(200).json({
            data:deletedUser,
            message:"User deleted successfully, you can restore this user within 30 days from the deletedAt date, after that user will be permanently deleted from database"
        })
    } catch (error) {
         console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}
const restoreUser=async(req,res)=>{
    try {
        const userId=req.params.id;
         const restoredUser=await User.findByIdAndUpdate(userId,
        {
            isDeleted:false,
            deletedAt:null,
            isActive:true
        },
        {new:true}
       );
         if(!restoredUser){
        return res.status(500).json("Error while restoring user")
         }
         const userStores=await Store.find({owner:userId});
            //restore all stores of this user
        await Store.updateMany({owner:userId},{$set:{isDeleted:false, deletedAt:null, status:"live", isActive:true}});
            //restore all products of this user
        await Product.updateMany({owner:userId},{$set:{isDeleted:false, deletedAt:null}});
            //restore all reviews of this user
        await Review.updateMany({owner:userId},{$set:{isDeleted:false, deletedAt:null}});
         
            return res.status(200).json({
            data:restoredUser,
            message:"User restored successfully, all stores of this user will be reactivated immediately"
        })
        } catch (error) {
            console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

const listStores=async(req,res)=>{
    try {
        const stores=await Store.find({}).sort({createdAt:-1});
        if(!stores || stores.length===0){
              return res
            .status(400)
            .json({
                data:[],
                message:"No User has registered any store yet"})
        }
        return res
          .status(200)
          .json({
              data:stores,
              message:" Stores have been listed successfully"
          })
        
    } catch (error) {
         console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}



const updateStore=async(req,res)=>{
    try {
        const storeId=req.params.id;
        const {status}=req.body;
        if(!["live", "suspended"].includes(status)){
            return res.status(400).json({message:"Invalid status value provided"})
        }

        const store=await Store.findByIdAndUpdate(storeId,
            {
                status: status==="live"?"live":"suspended",
                isActive: status==="live"?true:false,
                apiKey: status === "live" ? crypto.randomBytes(16).toString("hex") : null // Generate API key if going live and doesn't have one, else nullify it

            },
            {new:true}
        );
        if(!store){
            return res.status(404).json("Store not found")
        }
        return res.status(200).json({
            data:store,
            message:"Store has been deleted successfully"
        })
    } catch (error) {
            console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

// --- NEW ADMIN CONTROLLERS ---

const getPlatformAnalytics = async (req, res) => {
    try {
        // Run promises in parallel for speed
        const[totalUsers, activeStores, totalStores, disputedReviews] = await Promise.all([
            User.countDocuments({ isDeleted: false, role: "owner" }),
            Store.countDocuments({ isActive: true, isDeleted: false }),
            Store.countDocuments({ isDeleted: false }),
            Review.countDocuments({ status: "dispute", isDeleted: false })
        ]);

        return res.status(200).json({
            data: { totalUsers, activeStores, totalStores, disputedReviews },
            message: "Platform analytics fetched successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};

const getDisputedReviews = async (req, res) => {
    try {
        // Fetch all disputed reviews platform-wide, and populate store info!
        const disputes = await Review.find({ status: "disputed", isDeleted: false })
            .populate('store', 'storeName')
            .sort({ createdAt: -1 });
            
        return res.status(200).json({ data: disputes });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};


const resolveDispute = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { resolution } = req.body; // Frontend sends 'approved' or 'rejected'

        if (!["approved", "rejected"].includes(resolution)) {
            return res.status(400).json("Invalid resolution status. Must be 'approved' or 'rejected'.");
        }

        const review = await Review.findById(reviewId);
        if (!review) return res.status(404).json("Review not found");

        // Apply the admin's ruling
        review.status = resolution;

        // 🚨 THE ADMIN LOCK: If the store owner has disputed this 3 times, lock it forever.
        if (review.disputeCount >= 3) {
            review.isLocked = true;
        }

        await review.save();
        
        // Recalculate stats because an admin just changed a star rating's visibility!
        await recalculateProductStats(review.product); 

        return res.status(200).json({ 
            data: review, 
            message: review.isLocked 
                ? `Dispute resolved. Review marked as ${resolution} and is now PERMANENTLY LOCKED.` 
                : `Dispute resolved. Review marked as ${resolution}.` 
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};

const restoreStore = async (req, res) => {
    try {
        const storeId = req.params.id;

        // 1. Un-delete the Store
        // We use `.collection.findOneAndUpdate` to bypass any Mongoose pre('find') hooks that hide deleted items!
        await Store.collection.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(storeId) },
            { $set: { isDeleted: false, deletedAt: null, status: "live", isActive: true } }
        );

        // 2. Cascade Restore: Recover all associated Products
        await Product.collection.updateMany(
            { store: new mongoose.Types.ObjectId(storeId) }, 
            { $set: { isDeleted: false, deletedAt: null } }
        );

        // 3. Cascade Restore: Recover all associated Reviews
        // (We leave the reviews as "rejected" or whatever status they were, just remove the isDeleted flag)
        await Review.collection.updateMany(
            { store: new mongoose.Types.ObjectId(storeId) }, 
            { $set: { isDeleted: false, deletedAt: null } }
        );

        return res.status(200).json({ message: "Store and all associated products/reviews restored successfully." });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};


// Add `restoreStore` to your exports!
export { listUsers, deleteUser, listStores, updateStore, getPlatformAnalytics, getDisputedReviews, resolveDispute, restoreStore,restoreUser };