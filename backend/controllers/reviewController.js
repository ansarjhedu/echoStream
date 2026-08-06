import { createReviewWithDiscovery, recalculateProductStats } from "../services/reviewService.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import crypto from "crypto";
import { notifyUser } from "../services/notificationService.js";
import { autoResolveDisputeWithAi } from "./aiController.js";

const createReview=async(req,res)=>{

    try {
        const { productHandle, productTitle, customerName, customerEmail, rating, comment, verificationHash }=req.body;
       
        if(!productHandle || !productTitle || !customerName || !customerEmail || !rating || !comment){
            return res.status(400).json({ message: "All fields are required" });
        }

        if(["fuck", "shit", "damn"].includes(comment.toLowerCase())){
            return res.status(400).json({ message: "Inappropriate language used in comment" });
        }
        //get image paths from multer (if any)
         const imagePaths = req.files ? req.files.map(file => file.path) : [];

        // HMAC marks verified buyers; all submissions are auto-approved for the public widget.
        let isVerifiedBuyer = false;
        if (customerEmail && verificationHash && req.store?.apiKey) {
            const expectedHash = crypto
                .createHmac('sha256', req.store.apiKey)
                .update(customerEmail)
                .digest('hex');

            const provided = Buffer.from(String(verificationHash));
            const expected = Buffer.from(expectedHash);

            if (
                provided.length === expected.length &&
                crypto.timingSafeEqual(provided, expected)
            ) {
                isVerifiedBuyer = true;
            }
        }

         // Prepare review data with image paths
        const reviewData={
            productHandle,
            productTitle,
            customerName,
            customerEmail, 
            rating,
            comment,
            images: imagePaths,
            isVerifiedBuyer,
        }
    
        const review=await createReviewWithDiscovery(req.store._id, reviewData);
        await recalculateProductStats(review.product);

        const store = await Store.findById(req.store._id).select('owner storeName');
        if (store?.owner) {
            notifyUser({
                userId: store.owner,
                type: 'new_review',
                title: `New ${review.rating}★ review · ${store.storeName}`,
                message: `${review.customerName} reviewed "${review.productTitle}": ${String(review.comment || '').slice(0, 160)}`,
                link: '/workspace/reviews',
                important: review.rating <= 2,
                meta: { reviewId: String(review._id), storeId: String(store._id), rating: review.rating },
            });
        }
        
        res.status(201).json(review);
    } catch (error) {
        console.error("Error in createReview controller",error.message);
        res.status(500).json({ message: "Failed to create review" });
    }   
};


const updateReviewStatus = async (req, res) => {
    try {
        const { reviewId } = req.params;
        let { status, content } = req.body;
        const storeId = req.store._id;

        // Store owners may ONLY dispute — never approve/reject.
        if (!status || status !== "disputed") {
            return res.status(400).json({
                message: "Store owners can only set review status to 'disputed'.",
            });
        }
        if (!content || !String(content).trim()) {
            return res.status(400).json({ message: "A dispute reason is required." });
        }

        const images = req.files ? req.files.map(file => file.path) : [];

        const review = await Review.findOne({ _id: reviewId, store: storeId });
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        if (review.status !== "approved") {
            return res.status(400).json({
                message: "Only approved (live) reviews can be disputed.",
            });
        }

        const priorCount = review.disputeCount || review.disputedReason?.count || 0;
        if (review.isLocked || priorCount >= 3) {
            return res.status(403).json({
                message: "This review is permanently locked by Platform Admin or has reached the maximum dispute count.",
            });
        }

        const nextCount = priorCount + 1;
        review.status = "disputed";
        review.disputeCount = nextCount;
        review.disputedReason = {
            reason: content,
            proofImages: images,
            count: nextCount,
            createdAt: new Date(),
        };
        review.disputeResolution = undefined;
        review.markModified('disputeResolution');
        await review.save();
        // disputed reviews are excluded from public widget (status !== approved)
        await recalculateProductStats(review.product);

        // AI agent analyzes and may auto-resolve with owner-visible reasoning
        setImmediate(() => autoResolveDisputeWithAi(review._id));

        res.status(200).json({
            message: "Dispute submitted. Our AI agent is analyzing the case now.",
            data: review,
        });
    } catch (error) {
        console.error("Status Update Error:", error);
        res.status(500).json({ message: "Failed to update review status" });
    }
};

const getStoreProducts=async(req,res)=>{
        try {
            const storeId=req.store._id;
            const products=await Product.find({store:storeId}).select('_id productHandle productTitle stats');
            if(!products){
                return res.status(404).json({message:"No products found for this store"});
            }

            res.status(200).json({
                data:products,
                message:products.length===0?"No products found for this store":"Products fetched successfully"
            });
        }
        catch (error) {
            console.error("Error in getStoreProducts controller",error);
            res.status(500).json({message:"Failed to fetch products"});
        }
    }


const getPublicProductReviews = async (req, res) => {
   
    try {
        const storeId = req.store._id; // From apiKeyAuth
        const { productHandle } = req.params;
        const storeType = req.store.storeType; // Get store type from the store document
        
        if(storeType==="ecommerce" && !productHandle){
            return res.status(400).json({ message: "Product handle is required for eCommerce stores" });
        }
        
        // 1. Find the product ID first
        const product = await Product.findOne({ store: storeId, productHandle });
        
        
        if (!product) {
            return res.status(200).json({ 
                message: "No reviews yet", 
                data:[],
                stats: { avgRating: 0, totalReviews: 0 },
                widgetConfig: req.store.widgetConfig,
                storeType: storeType // <-- Include store type in the response
            });
        }
        
        // 2. Paginated approved reviews + full rating distribution
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const minGoogle = req.store.googleReviews?.minRating || 1;
        // Hide Google imports below the store's rating filter; native reviews always pass.
        const reviewFilter = {
            product: product._id,
            status: 'approved',
            $or: [
                { source: { $ne: 'google' } },
                { source: 'google', rating: { $gte: minGoogle } },
            ],
        };

        const [reviews, total, ratingCounts] = await Promise.all([
            Review.find(reviewFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('customerName rating comment createdAt merchantReply images isVerifiedBuyer source'),
            Review.countDocuments(reviewFilter),
            Review.aggregate([
                { $match: { ...reviewFilter, isDeleted: { $ne: true } } },
                { $group: { _id: '$rating', count: { $sum: 1 } } },
            ]),
        ]);

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingCounts.forEach((row) => {
            if (distribution[row._id] !== undefined) distribution[row._id] = row.count;
        });

        res.status(200).json({ 
            productTitle: product.productTitle,
            stats: {
                avgRating: product.stats?.avgRating || 0,
                totalReviews: product.stats?.totalReviews || 0,
                distribution,
            },
            widgetConfig: req.store.widgetConfig, 
            data: reviews,
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + reviews.length < total,
            },
            message: "Reviews fetched successfully",
            storeType: storeType,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
};


    const merchantReplyToReview = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const { reply } = req.body;
            const storeId=req.store._id;

            if (!reply) {
                return res.status(400).json({ message: "Reply content is required" });
            }

            // 1. Find the review first
            const review = await Review.findOneAndUpdate({ _id: reviewId, store: storeId }, { $set: { 'merchantReply.content': reply, 'merchantReply.createdAt': new Date() } }, { new: true });
            if (!review){
                return res.status(404).json({ message: "Review not found or unauthorized" });
            } 


             res.status(200).json({ 
            message: "Reply added successfully", 
            data: review 
        });
        } catch (error) {
            console.error("Error in merchantReplyToReview controller", error);
            res.status(500).json({ message: "Failed to reply to review" });
        }
    };
const getReviews = async (req, res) => {
    try {
        const filter = { store: req.store._id };
        if (req.query.productId) {
            filter.product = req.query.productId;
        }
        const includeHidden = String(req.query.includeHidden || '') === '1';
        if (!includeHidden) {
            // default: live + disputed still visible in inbox; soft-hidden excluded by middleware
        } else {
            // include soft-hidden so merchant can unhide
        }

        let query = Review.find(filter).sort({ createdAt: -1 });
        if (includeHidden) {
            query = query.setOptions({ includeDeleted: true });
        }
        const reviews = await query;
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch admin reviews" });
    }
};

/** Soft-hide a review from the public widget (merchant control). */
const hideReview = async (req, res) => {
    try {
        const storeId = req.store._id;
        const { reviewId } = req.params;
        const review = await Review.findOne({ _id: reviewId, store: storeId });
        if (!review) return res.status(404).json({ message: 'Review not found.' });
        if (review.isLocked) {
            return res.status(403).json({ message: 'This review is locked by Platform Admin.' });
        }

        review.isDeleted = true;
        review.deletedAt = new Date();
        await review.save();
        await recalculateProductStats(review.product);

        return res.status(200).json({
            data: review,
            message: 'Review hidden from your public widget.',
        });
    } catch (error) {
        console.error('hideReview', error);
        return res.status(500).json({ message: 'Failed to hide review.' });
    }
};

const unhideReview = async (req, res) => {
    try {
        const storeId = req.store._id;
        const { reviewId } = req.params;
        const review = await Review.findOne({ _id: reviewId, store: storeId }).setOptions({
            includeDeleted: true,
        });
        if (!review) return res.status(404).json({ message: 'Review not found.' });

        review.isDeleted = false;
        review.deletedAt = null;
        await review.save();
        await recalculateProductStats(review.product);

        return res.status(200).json({
            data: review,
            message: 'Review is visible on your widget again.',
        });
    } catch (error) {
        console.error('unhideReview', error);
        return res.status(500).json({ message: 'Failed to unhide review.' });
    }
};

/** Bulk-hide approved reviews at or below a star rating. */
const bulkHideByRating = async (req, res) => {
    try {
        const storeId = req.store._id;
        const maxRating = Number(req.body?.maxRating);
        if (![1, 2, 3, 4, 5].includes(maxRating)) {
            return res.status(400).json({ message: 'maxRating must be 1–5.' });
        }

        const filter = {
            store: storeId,
            isDeleted: { $ne: true },
            status: { $in: ['approved', 'pending'] },
            rating: { $lte: maxRating },
            isLocked: { $ne: true },
        };
        if (req.body?.productId) filter.product = req.body.productId;

        const matches = await Review.find(filter).select('_id product');
        if (!matches.length) {
            return res.status(200).json({ data: { hidden: 0 }, message: 'No matching reviews to hide.' });
        }

        const now = new Date();
        await Review.updateMany(
            { _id: { $in: matches.map((m) => m._id) } },
            { $set: { isDeleted: true, deletedAt: now } }
        );

        const productIds = [...new Set(matches.map((m) => String(m.product)))];
        await Promise.all(productIds.map((pid) => recalculateProductStats(pid)));

        return res.status(200).json({
            data: { hidden: matches.length, maxRating },
            message: `Hidden ${matches.length} review(s) rated ${maxRating}★ or below.`,
        });
    } catch (error) {
        console.error('bulkHideByRating', error);
        return res.status(500).json({ message: 'Failed to bulk-hide reviews.' });
    }
};

/** Store dispute inbox: reviews this store has disputed (pending + resolved history). */
const getStoreDisputes = async (req, res) => {
    try {
        const storeId = req.store._id;
        const filterParam = (req.query.filter || 'all').toLowerCase();
        const allowed = ['all', 'pending', 'approved', 'rejected'];
        if (!allowed.includes(filterParam)) {
            return res.status(400).json({ message: "Invalid filter. Use all|pending|approved|rejected." });
        }

        const baseFilter = {
            store: storeId,
            'disputedReason.reason': { $exists: true, $nin: [null, ''] },
        };

        const allDisputed = await Review.find(baseFilter).sort({
            'disputedReason.createdAt': -1,
            updatedAt: -1,
        });

        const summary = {
            total: allDisputed.length,
            pending: allDisputed.filter((r) => r.status === 'disputed').length,
            approved: allDisputed.filter((r) => r.status === 'approved').length,
            rejected: allDisputed.filter((r) => r.status === 'rejected').length,
        };

        let data = allDisputed;
        if (filterParam === 'pending') data = allDisputed.filter((r) => r.status === 'disputed');
        else if (filterParam === 'approved') data = allDisputed.filter((r) => r.status === 'approved');
        else if (filterParam === 'rejected') data = allDisputed.filter((r) => r.status === 'rejected');

        return res.status(200).json({ data, summary });
    } catch (error) {
        console.error("Error in getStoreDisputes", error);
        return res.status(500).json({ message: "Failed to fetch store disputes" });
    }
};

export {
    createReview,
    updateReviewStatus,
    getStoreProducts,
    getPublicProductReviews,
    merchantReplyToReview,
    getReviews,
    getStoreDisputes,
    hideReview,
    unhideReview,
    bulkHideByRating,
};