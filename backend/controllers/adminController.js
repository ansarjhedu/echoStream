import User from "../models/User.js";
import Store from "../models/Store.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Support from "../models/Support.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { applyDisputeDecision } from "./aiController.js";
import { notifyUser } from "../services/notificationService.js";

const listUsers=async(req,res)=>{

    try {
        const allUsers= await User.find({role:"owner"}).sort({createdAt:-1});
       
        if(!allUsers || allUsers.length===0){
            return res.status(200).json({
                data:[],
                message:"No users found"
            })
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
       const storeIds = userStores.map((s) => s._id);
            //soft delete all stores of this user
        await Store.updateMany({owner:userId},{$set:{isDeleted:true, deletedAt:Date.now(), status:"deleted", isActive:false}});
            //soft delete products/reviews via store ids (models have no owner field)
        if (storeIds.length) {
            await Product.updateMany({store: {$in: storeIds}},{$set:{isDeleted:true, deletedAt:Date.now()}});
            await Review.updateMany({store: {$in: storeIds}},{$set:{isDeleted:true, deletedAt:Date.now()}});
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
         const storeIds = userStores.map((s) => s._id);
            //restore all stores of this user
        await Store.updateMany({owner:userId},{$set:{isDeleted:false, deletedAt:null, status:"live", isActive:true}});
        if (storeIds.length) {
            await Product.updateMany({store: {$in: storeIds}},{$set:{isDeleted:false, deletedAt:null}});
            await Review.updateMany({store: {$in: storeIds}},{$set:{isDeleted:false, deletedAt:null}});
        }
         
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
        const storesWithOwner=await Promise.all(stores.map(async(store)=>{
            const owner=await User.findById(store.owner);
           
            return {
                ...store._doc,
                ownerName: owner ? owner.userName : "Unknown"
            }
        }));
     
        if(!stores || stores.length===0){
              return res
            .status(200)
            .json({
                data:[],
                message:"No User has registered any store yet"})
        }
        return res
          .status(200)
          .json({
              storesWithOwner,
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
        const[totalUsers, activeStores, totalStores, disputedReviews, tickets] = await Promise.all([
            User.countDocuments({ isDeleted: false, role: "owner" }),
            Store.countDocuments({ isActive: true, isDeleted: false }),
            Store.countDocuments({ isDeleted: false }),
            Review.countDocuments({ status: "disputed", isDeleted: false }),
            Support.countDocuments({ status: { $ne: "resolved" } }) // Count of open tickets for AdminOverview
        ]);

        return res.status(200).json({
            data: { totalUsers, activeStores, totalStores, disputedReviews, tickets },
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
        const { resolution, reason } = req.body;
        // approve_dispute → admin agrees with merchant → status rejected (hidden)
        // reject_dispute  → admin disagrees with merchant → status approved (live again)
        if (!["approve_dispute", "reject_dispute"].includes(resolution)) {
            return res.status(400).json({
                message: "Invalid resolution. Use 'approve_dispute' or 'reject_dispute'.",
            });
        }

        const review = await Review.findById(reviewId);
        if (!review) return res.status(404).json({ message: "Review not found" });
        if (review.status !== "disputed") {
            return res.status(400).json({ message: "Only disputed reviews can be resolved." });
        }

        const adminReason =
            (reason && String(reason).trim()) ||
            (resolution === 'approve_dispute'
                ? 'A platform admin reviewed your claim and upheld the dispute. The review is no longer shown on your widget.'
                : 'A platform admin reviewed your claim and declined the dispute. The review remains live on your widget.');

        const updated = await applyDisputeDecision(review, {
            decision: resolution,
            reason: adminReason,
            resolvedBy: 'admin',
            confidence: null,
        });

        return res.status(200).json({
            data: updated,
            message: updated.isLocked
                ? `Dispute resolved. Review is ${updated.status} and permanently locked.`
                : `Dispute resolved. Review marked as ${updated.status}.`,
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



const getTicketsFromUsers=async(req,res)=>{
    try {
        const filterParam = (req.query.filter || 'all').toLowerCase();
        const allowed = ['all', 'open', 'in_progress', 'resolved', 'pending'];
        if (!allowed.includes(filterParam)) {
            return res.status(400).json({ message: "Invalid filter. Use all|open|in_progress|resolved." });
        }

        const allTickets = await Support.find({}).sort({ updatedAt: -1, createdAt: -1 });
        const summary = {
            total: allTickets.length,
            open: allTickets.filter((t) => t.status === 'open').length,
            in_progress: allTickets.filter((t) => t.status === 'in_progress').length,
            resolved: allTickets.filter((t) => t.status === 'resolved').length,
        };
        const statusFilter = filterParam === 'pending' ? 'open' : filterParam;
        const data = statusFilter === 'all'
            ? allTickets
            : allTickets.filter((t) => t.status === statusFilter);

        return res.status(200).json({
            data,
            summary,
            message: "Support tickets fetched successfully"
        });
    }
    catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

const replyToTicket=async(req,res)=>{
    try {
        const ticketId=req.params.id;
        const {content}=req.body;
        if(!content){
            return res.status(400).json({message:"Reply content cannot be empty"})
        }
      
        const ticket=await Support.findById(ticketId);
        if (!ticket) {
            return res.status(404).json("Support ticket not found");
        }

        if(ticket.status==="resolved"){
            return res.status(400).json("Cannot reply to a resolved ticket")
        }
        ticket.conversation.push({
            content:content,
            sender:"admin",
            timestamp:Date.now()
        });
        ticket.status="in_progress"; // Mark as in_progress when admin replies
        await ticket.save();

        notifyUser({
            userId: ticket.owner,
            type: 'support_reply',
            title: 'New support reply',
            message: String(content).slice(0, 200),
            link: `/hub/support?ticket=${ticket._id}`,
            important: true,
            meta: { ticketId: String(ticket._id) },
        });
        
        return res.status(200).json({
            data:ticket,
            message:"Replied to support ticket successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
        }
}
    const resolveTicket=async(req,res)=>{
    try {
        const ticketId=req.params.id;
        const ticket=await Support.findByIdAndUpdate(ticketId,
            {
                status:"resolved",
            },
            {new:true}
        );
        if(!ticket){
            return res.status(404).json("Support ticket not found")
        }
        notifyUser({
            userId: ticket.owner,
            type: 'support_resolved',
            title: 'Support ticket resolved',
            message: `Your ticket "${ticket.subject}" was marked resolved.`,
            link: `/hub/support?ticket=${ticket._id}`,
            important: true,
            meta: { ticketId: String(ticket._id) },
        });
        return res.status(200).json({
            data:ticket,
            message:"Support ticket marked as resolved successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

/** Claim / accept an open ticket (sets assignee + in_progress). */
const claimTicket = async (req, res) => {
    try {
        const ticket = await Support.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });
        if (ticket.status === 'resolved') {
            return res.status(400).json({ message: 'Resolved tickets cannot be claimed.' });
        }

        ticket.assignedTo = req.user._id;
        ticket.claimedAt = new Date();
        ticket.status = 'in_progress';
        ticket.conversation.push({
            sender: 'admin',
            submittedBy: req.user.userName,
            content: `${req.user.userName} accepted this ticket and is now handling it.`,
        });
        await ticket.save();

        return res.status(200).json({
            data: ticket,
            message: 'Ticket accepted.',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export { listUsers, deleteUser, listStores, updateStore, getPlatformAnalytics, getDisputedReviews, resolveDispute, restoreStore,restoreUser, getTicketsFromUsers, replyToTicket, resolveTicket, claimTicket};