import Store from '../models/Store.js'
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Support from '../models/Support.js';
import User from '../models/User.js';
import { fetchPageMeta } from '../utils/pageMeta.js';
import { isWithinLimit, getEntitlements } from '../utils/plans.js';
import { logActivity, makePublicSlug, frontendBaseUrl } from '../utils/activityLog.js';
import { ensureStorePublicSlug } from './trustController.js';

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

        const owner = await User.findById(req.user._id).select('plan subscriptionStatus trialEndsAt currentPeriodEnd cancelAtPeriodEnd');
        const limits = getEntitlements(owner).catalog;
        const existingCount = await Store.countDocuments({
            owner: req.user._id,
            isDeleted: { $ne: true },
        });
        if (!isWithinLimit(existingCount, limits.maxStores)) {
            return res.status(403).json({
                message: `Store limit reached for the ${limits.name} plan (${limits.maxStores === -1 ? 'unlimited' : limits.maxStores}). Upgrade in Billing.`,
                code: 'PLAN_STORE_LIMIT',
            });
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
            publicSlug: makePublicSlug(storeName),
            widgetMeta: {
                publishedLayout: 'glassmorphism',
                publishedAt: new Date(),
            },
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

        await ensureStorePublicSlug(store);

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

/** Owner can rename store / update website domain after create */
const updateStoreDetails = async (req, res) => {
    try {
        if (req.user.role === 'staff') {
            return res.status(403).json({
                message: 'Only the store owner can edit store name or website URL.',
            });
        }

        const store = req.store;
        if (!store || store.isDeleted) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        const { storeName, websiteUrl, refreshPreview } = req.body || {};
        const nextName = storeName != null ? String(storeName).trim() : null;
        const nextUrl =
            websiteUrl !== undefined
                ? String(websiteUrl || '').trim() || null
                : undefined;

        if (nextName !== null) {
            if (!nextName) {
                return res.status(400).json({ message: 'Store name cannot be empty.' });
            }
            if (nextName !== store.storeName) {
                const clash = await Store.findOne({
                    storeName: nextName,
                    owner: store.owner,
                    _id: { $ne: store._id },
                    isDeleted: { $ne: true },
                });
                if (clash) {
                    return res.status(400).json({
                        message: 'You already have another store with that name.',
                    });
                }
                store.storeName = nextName;
            }
        }

        if (nextUrl !== undefined) {
            store.websiteUrl = nextUrl;
        }

        if (refreshPreview && store.websiteUrl) {
            try {
                const meta = await fetchPageMeta(store.websiteUrl);
                if (meta) store.siteMeta = meta;
            } catch {
                /* keep previous siteMeta if preview fails */
            }
        }

        await store.save();
        return res.status(200).json({
            data: store,
            message: 'Store details updated.',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

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
/** Soft-hide a product from embeds. Reviews stay attached — cannot wipe history by re-adding the same handle. */
const hideProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const storeId = req.store._id;

        const product = await Product.findOne({ _id: productId, store: storeId });
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        product.isDeleted = true;
        product.deletedAt = new Date();
        await product.save();

        await logActivity({
            storeId,
            actorId: req.user?._id,
            action: 'product.hide',
            targetType: 'product',
            targetId: String(productId),
            meta: { productHandle: product.productHandle },
        });

        return res.status(200).json({
            data: product,
            message:
                'Product hidden from your storefront. Its reviews stay in your records — reusing the same product handle will reopen this history, not a blank product.',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to hide product.' });
    }
};

const unhideProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const storeId = req.store._id;

        const product = await Product.findOne({ _id: productId, store: storeId }).setOptions({
            includeDeleted: true,
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        product.isDeleted = false;
        product.deletedAt = null;
        await product.save();

        await logActivity({
            storeId,
            actorId: req.user?._id,
            action: 'product.unhide',
            targetType: 'product',
            targetId: String(productId),
            meta: { productHandle: product.productHandle },
        });

        return res.status(200).json({
            data: product,
            message: 'Product is visible on your storefront again (along with its review history).',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to unhide product.' });
    }
};
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
                            status: 'approved',
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

        const [totalProducts, totalReviews, approvedReviews, pendingReviews, store] = await Promise.all([
            Product.countDocuments({ store: storeId, isDeleted: false }),
            Review.countDocuments({ store: storeId, isDeleted: false }),
            Review.countDocuments({ store: storeId, status: "approved", isDeleted: false }),
            Review.countDocuments({ store: storeId, status: "pending", isDeleted: false }),
            Store.findById(storeId).select('widgetStats widgetMeta widgetConfig.layout publicSlug'),
        ]);

        return res.status(200).json({
            data: {
                totalProducts,
                totalReviews,
                approvedReviews,
                pendingReviews,
                widgetStats: store?.widgetStats || { impressions: 0, byLayout: {}, lastImpressedAt: null },
                widgetMeta: store?.widgetMeta || null,
                publishedLayout: store?.widgetMeta?.publishedLayout || store?.widgetConfig?.layout || null,
                publicSlug: store?.publicSlug || null,
            },
            message: "Store analytics fetched"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
};

const getWidgetStats = async (req, res) => {
    try {
        const store = await Store.findById(req.store._id).select(
            'widgetStats widgetMeta widgetConfig.layout publicSlug storeName'
        );
        if (!store) return res.status(404).json({ message: 'Store not found.' });
        const slug = await ensureStorePublicSlug(store);
        return res.status(200).json({
            data: {
                publishedLayout: store.widgetMeta?.publishedLayout || store.widgetConfig?.layout || null,
                publishedAt: store.widgetMeta?.publishedAt || null,
                impressions: store.widgetStats?.impressions || 0,
                byLayout: store.widgetStats?.byLayout || {},
                lastImpressedAt: store.widgetStats?.lastImpressedAt || null,
                publicSlug: slug,
                trustPageUrl: `${frontendBaseUrl()}/trust/${slug}`,
            },
        });
    } catch (error) {
        console.error('getWidgetStats', error);
        return res.status(500).json({ message: 'Failed to load widget stats.' });
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

        store.widgetMeta = {
            publishedLayout: store.widgetConfig.layout,
            publishedAt: new Date(),
        };

        await store.save();

        await logActivity({
            storeId: store._id,
            actorId: req.user?._id,
            action: 'widget.publish',
            targetType: 'store',
            targetId: String(store._id),
            meta: { layout: store.widgetConfig.layout },
        });

        return res.status(200).json({
            data: store.widgetConfig,
            widgetMeta: store.widgetMeta,
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

export { createStore, myStores, getStoreById, updateStoreStatus, updateStoreDetails, hideProduct, unhideProduct, deleteStore, getStoreAnalytics, getWidgetStats, updateWidgetConfig, getPresenceOverview, previewStoreUrl };