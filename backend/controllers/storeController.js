import Store from '../models/Store.js'
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Support from '../models/Support.js';
import { fetchPageMeta } from '../utils/pageMeta.js';

const createStore=async(req,res)=>{
    try {
        if (req.user.role === 'staff') {
            return res.status(403).json({ message: "Only the Store Owner can modify store operational status or create stores." });
        }

        const {storeName, storeType, websiteUrl, siteMeta}=req.body;
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
            websiteUrl: websiteUrl || null,
            siteMeta: siteMeta || undefined,
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
        const ownerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
        if (!ownerId) {
            return res.status(200).json({ data: [], message: "No stores available for this account" });
        }

       const stores=await Store.find({
        owner: ownerId,
        isDeleted: false,
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
        // Destructive lifecycle: staff cannot create/toggle/delete stores (even storeRole administrator)
        if (req.user.role === 'staff') {
            return res.status(403).json({ message: "Only the Store Owner can modify store operational status or create stores." });
        }

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
        if (req.user.role === 'staff') {
            return res.status(403).json({ message: "Only the Store Owner can modify store operational status or create stores." });
        }

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
// Presence hub telemetry — sentiment from rating buckets + open tickets
const getPresenceOverview = async (req, res) => {
    try {
        const ownerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
        if (!ownerId) {
            return res.status(200).json({
                data: {
                    sentiment: { positive: 0, neutral: 0, negative: 0, total: 0 },
                    tickets: { open: 0, in_progress: 0, unresolved: 0 },
                    sites: 0,
                    publishedWidgets: 0,
                },
                message: 'Presence overview',
            });
        }

        const presenceSites = await Store.find({
            owner: ownerId,
            isDeleted: false,
            storeType: { $in: ['portfolio', 'blog'] },
        }).select('_id widgetConfig apiKey');

        const siteIds = presenceSites.map((s) => s._id);

        const [ratingBuckets, openTickets, inProgressTickets] = await Promise.all([
            siteIds.length
                ? Review.aggregate([
                    {
                        $match: {
                            store: { $in: siteIds },
                            isDeleted: { $ne: true },
                            status: { $in: ['approved', 'disputed'] },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            positive: {
                                $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] },
                            },
                            neutral: {
                                $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
                            },
                            negative: {
                                $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] },
                            },
                            total: { $sum: 1 },
                        },
                    },
                ])
                : Promise.resolve([]),
            Support.countDocuments({ owner: ownerId, status: 'open' }),
            Support.countDocuments({ owner: ownerId, status: 'in_progress' }),
        ]);

        const bucket = ratingBuckets[0] || { positive: 0, neutral: 0, negative: 0, total: 0 };
        const publishedWidgets = presenceSites.filter(
            (s) => s.apiKey && s.widgetConfig?.layout
        ).length;

        return res.status(200).json({
            data: {
                sentiment: {
                    positive: bucket.positive || 0,
                    neutral: bucket.neutral || 0,
                    negative: bucket.negative || 0,
                    total: bucket.total || 0,
                },
                tickets: {
                    open: openTickets,
                    in_progress: inProgressTickets,
                    unresolved: openTickets + inProgressTickets,
                },
                sites: presenceSites.length,
                publishedWidgets,
            },
            message: 'Presence overview',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json('Internal Server Error');
    }
};

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
        const {
            layout,
            primaryColor,
            backgroundColor,
            textColor,
            fontFamily,
            fontSize,
            fontWeight,
            titleFontSize,
            lineHeight,
            carouselAutoplay,
            carouselIntervalMs,
            carouselShowArrows,
        } = req.body;

        // Ensure valid layout selection
        if (layout && !['glassmorphism', 'classic', 'minimal', 'grid','carousel', 'brutalism'].includes(layout)) {
            return res.status(400).json("Invalid layout selected.");
        }

        const prev = store.widgetConfig || {};
        const clamp = (n, min, max, fallback) => {
            const v = Number(n);
            if (!Number.isFinite(v)) return fallback;
            return Math.min(max, Math.max(min, v));
        };

        // Update the configuration
        store.widgetConfig = {
            layout: layout || prev.layout,
            primaryColor: primaryColor || prev.primaryColor,
            backgroundColor: backgroundColor || prev.backgroundColor,
            textColor: textColor || prev.textColor,
            fontFamily: fontFamily || prev.fontFamily,
            fontSize: clamp(fontSize, 12, 22, prev.fontSize || 15),
            fontWeight: clamp(fontWeight, 300, 700, prev.fontWeight || 400),
            titleFontSize: clamp(titleFontSize, 16, 36, prev.titleFontSize || 22),
            lineHeight: clamp(lineHeight, 1.2, 2, prev.lineHeight || 1.5),
            carouselAutoplay:
                typeof carouselAutoplay === 'boolean' ? carouselAutoplay : (prev.carouselAutoplay !== false),
            carouselIntervalMs:
                typeof carouselIntervalMs === 'number'
                    ? Math.min(12000, Math.max(2000, carouselIntervalMs))
                    : (prev.carouselIntervalMs || 3500),
            carouselShowArrows:
                typeof carouselShowArrows === 'boolean' ? carouselShowArrows : (prev.carouselShowArrows !== false),
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


const previewStoreUrl = async (req, res) => {
    try {
        if (req.user.role === 'staff') {
            return res.status(403).json({ message: 'Only the store owner can preview store URLs.' });
        }
        const { url } = req.body || {};
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'A URL is required.' });
        }
        const meta = await fetchPageMeta(url);
        return res.status(200).json({ data: meta, message: 'Preview ready' });
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({ message: error.message || 'Internal Server Error' });
    }
};

export { createStore, myStores, getStoreById, updateStoreStatus, deleteProduct, deleteStore, getStoreAnalytics, updateWidgetConfig, getPresenceOverview, previewStoreUrl };