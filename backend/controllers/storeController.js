import Store from '../models/Store.js'
import Product from '../models/Product.js';
import Review from '../models/Review.js';

const createStore=async(req,res)=>{
    try {
        const {storeName, storeType}=req.body;
        if(!storeName || !storeType){
            return res
            .status(400)
            .json("One or more fields are missing")
        }

        const existingStore= await Store.findOne({storeName,owner:req.user._id});
        if(existingStore){
            return res
            .status(400)
            .json("You can not have multiple stores with same name! ")
        }

        const store=await Store.create({
            storeName,
            storeType,
            owner:req.user._id,
        })

        if(!store){
            return res
            .status(500)
            .json("Error while creating store!")
        }
        return res
        .status(201)
        .json({
            data:store,
            message:"Congratulation your store has been registered successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

const myStores=async(req,res)=>{
    try {
        
       const stores=await Store.find({
        owner:req.user._id,
        //isDeleted:false
        }).sort({createdAt:-1});
     if(!stores || stores.length === 0){
            return res.status(200).json({ data:[], message: "You have not registered any store yet" });
       }
       return res.status(200).json({
        data: stores,
        message:"Your stores have been listed successfully"
       });

    } catch (error) {
         console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

const getStoreById=async(req,res)=>{
    try {
        const store=req.store; // This is set by authStore middleware
        if(!store){
            return res.status(404).json("Store not found")
        }
       
        return res.status(200).json({
            data:store,
            message:"Store details fetched successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

const updateStoreStatus=async(req,res)=>{
    try {
        const store=req.store; // This is set by authStore middleware
        const {status,isDeleted}=req.body;
        //update store status to either live or disabled, user can only update status of their own store
        if(!["live","disabled","disputed", "deleted"].includes(status) ){
            return res.status(400).json("Invalid status value or Store has been suspended by Admin, you can not update the status of this store")
        }
        //update status of the store and isActive field accordingly
        store.status=status==="live"?"live":status==="disabled"?"disabled":status==="disputed"?"disputed":"deleted";
        store.isActive=status==="live" && !isDeleted ?true:false; 
        store.isDeleted=isDeleted;
        store.deletedAt=isDeleted?Date.now():null;

        await store.save();
        
        return res.status(200).json({
            data:store,
            message:store.status==="live" ? "Store has been activated successfully" : store.status==="disabled"?"Store has been disabled successfully":store.status==="disputed"?"Store is under dispute, please contact support":"Store has been deleted successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

const deleteStore=async(req,res)=>{
    try {
        const store=req.store; // This is set by authStore middleware
        const {status}=req.body;
        //user can only delete their own store
        store.isDeleted=true;
        store.deletedAt=Date.now();
        store.status="deleted";
        store.isActive=false;
        await store.save();
        //mark all products of this store as deleted
        await
            Product.updateMany({store:store._id},{
                isDeleted:true,
                deletedAt:Date.now()
            })
        //mark all reviews of this store as deleted
        await Review.updateMany({store:store._id},{
            isDeleted:true,
            deletedAt:Date.now()
        })  
        return res.status(200).json({
            data:store,
            message:"Store has been deleted successfully"
        })
    }

        catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
        }
}
const deleteProduct=async(req,res)=>{
    try {
        const productId=req.params.id;
        const storeId=req.store._id; // This is set by authStore middleware
        //user can only delete product of their own store
        const product=await Product.findOneAndUpdate({_id:productId,store:storeId},
            {
                isDeleted:true,
                deletedAt:Date.now()
            },
            {new:true}
        );
        if(!product){
            return res.status(404).json("Product not found or you are not authorized to delete this product")
        }
        //mark all reviews of this product as deleted
        await Review.updateMany({product:productId},{
            isDeleted:true,
            deletedAt:Date.now()
        })
        return res.status(200).json({
            data:product,
            message:"Product has been deleted successfully"
        })
        
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}
// --- NEW STORE OWNER CONTROLLER ---
const getStoreAnalytics = async (req, res) => {
    try {
        const storeId = req.store._id;

        const [totalProducts, totalReviews, approvedReviews, pendingReviews] = await Promise.all([
            Product.countDocuments({ store: storeId, isDeleted: false }),
            Review.countDocuments({ store: storeId, isDeleted: false }),
            Review.countDocuments({ store: storeId, status: "approved", isDeleted: false }),
            Review.countDocuments({ store: storeId, status: "rejected", isDeleted: false })
        ]);

        return res.status(200).json({
            data: { totalProducts, totalReviews, approvedReviews, pendingReviews },
            message: "Store analytics fetched"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};
const updateWidgetConfig = async (req, res) => {
    try {
        const store = req.store; // from authStore middleware
        const { layout, primaryColor, backgroundColor, textColor, fontFamily } = req.body;

        // Ensure valid layout selection
        if (layout && !['glassmorphism', 'classic', 'minimal', 'grid','carousel', 'brutalism'].includes(layout)) {
            return res.status(400).json("Invalid layout selected.");
        }

        // Update the configuration
        store.widgetConfig = {
            layout: layout || store.widgetConfig.layout,
            primaryColor: primaryColor || store.widgetConfig.primaryColor,
            backgroundColor: backgroundColor || store.widgetConfig.backgroundColor,
            textColor: textColor || store.widgetConfig.textColor,
            fontFamily: fontFamily || store.widgetConfig.fontFamily
        };

        await store.save();

        return res.status(200).json({
            data: store.widgetConfig,
            message: "Widget design updated successfully!"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};


export { createStore, myStores, getStoreById, updateStoreStatus, deleteProduct, deleteStore, getStoreAnalytics,updateWidgetConfig };