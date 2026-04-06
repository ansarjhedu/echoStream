import User from "../models/User.js";
import Store from "../models/Store.js";
import Review from "../models/Review.js";

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
         return res.status(200).json({
            data:deletedUser,
            message:"User deleted successfully, you can restore this user within 30 days from the deletedAt date, after that user will be permanently deleted from database"
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
        if(!["live","suspended"].includes(status)){
                return res.status(400).json("Invalid status value or you are not authorized to update this store")
        }
        const store=await Store.findOneAndUpdate({ _id: storeId }, { status, isActive: status==="live"?true:false }, { new: true });
        if(!store){
            return res.status(404).json("Store not found")
        }
        return res.status(200).json({
            data:store,
            message:store.status==="suspended"?"Store has been suspended successfully":"Store has been activated successfully"
        })
    } catch (error) {
         console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

const deleteStore=async(req,res)=>{
    try {
        const storeId=req.params.id;
        const store=await Store.findByIdAndUpdate(storeId,
            {
                isDeleted:true,
                deletedAt:Date.now(),
                status:"disabled",
                isActive:false
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
        const disputes = await Review.find({ status: "dispute", isDeleted: false })
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
        const { resolution } = req.body; // 'approved' or 'rejected'

        if (!["approved", "rejected"].includes(resolution)) {
            return res.status(400).json("Invalid resolution status");
        }

        const review = await Review.findByIdAndUpdate(
            reviewId, 
            { status: resolution }, 
            { new: true }
        );

        if (!review) return res.status(404).json("Review not found");

        return res.status(200).json({ 
            data: review, 
            message: `Dispute resolved. Review marked as ${resolution}.` 
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};

const retreiveDeletedUsers = async (req, res) => {
    try {
        const deletedUsers = await User.find({ isDeleted: true, role: "owner" }).sort({ deletedAt: -1 });
        if (!deletedUsers || deletedUsers.length === 0) {
            return res.status(404).json("No deleted users found");
        }
        return res.status(200).json({
            data: deletedUsers,
            message: "Deleted users retrieved successfully"
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};

const restoreDeletedUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const restoredUser = await User.findByIdAndUpdate(
            userId,
            {
                isDeleted: false,
                deletedAt: null,
                isActive: true
            },
            { new: true }
        );
        if (!restoredUser) {
            return res.status(404).json("User not found or cannot be restored");
        }
        return res.status(200).json({
            data: restoredUser,
            message: "User restored successfully"
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};

const restoreDeletedStore = async (req, res) => {
    try {
        const storeId = req.params.id;
        const restoredStore = await Store.findByIdAndUpdate(
            storeId,
            {
                isDeleted: false,
                deletedAt: null,
                status: "disabled", // Restored stores will be disabled by default, admin can activate after review
                isActive: false
            },
            { new: true }
        );
        const restoredProducts = await Product.updateMany(
            { store: storeId, isDeleted: true },
            { isDeleted: false, deletedAt: null },
            { new: true }
        );
        const restoredReviews = await Review.updateMany(
            { store: storeId, isDeleted: true },
            { isDeleted: false, deletedAt: null },
            { new: true }
        );
        
        if (!restoredStore) {
            return res.status(404).json("Store not found or cannot be restored");
        }
        return res.status(200).json({
            data: restoredStore,
            message: "Store restored successfully"
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};
export { listUsers, deleteUser, listStores, updateStore, deleteStore, getPlatformAnalytics, getDisputedReviews, resolveDispute, retreiveDeletedUsers, restoreDeletedUser, restoreDeletedStore };