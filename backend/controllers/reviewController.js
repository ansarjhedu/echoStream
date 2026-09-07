import { createReviewWithDiscovery, recalculateProductStats } from "../services/reviewService.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import crypto from "crypto";
import { notifyUser } from "../services/notificationService.js";
import { sendReviewThankYouEmail } from "../services/reviewMailService.js";
import User from "../models/User.js";
import { getEntitlements } from "../utils/plans.js";
import { recordWidgetImpression } from "../utils/widgetImpressions.js";
import { logActivity } from "../utils/activityLog.js";

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

        const store = await Store.findById(req.store._id).select('owner storeName storeType');
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

        // Store-branded thank-you (ecommerce + plan feature) — do not block the API response
        if (store?.storeType === 'ecommerce' && store?.owner) {
            User.findById(store.owner)
              .select('plan subscriptionStatus trialEndsAt currentPeriodEnd cancelAtPeriodEnd')
              .then((owner) => {
                const ent = getEntitlements(owner || {});
                if (!ent.features.thankYouEmails) return null;
                return sendReviewThankYouEmail({ store, review });
              })
              .catch((err) => {
                console.error('review thank-you email failed', err?.message || err);
              });
        }
        
        res.status(201).json(review);
    } catch (error) {
        console.error("Error in createReview controller",error.message);
        res.status(500).json({ message: "Failed to create review" });
    }   
};


const getStoreProducts=async(req,res)=>{
        try {
            const storeId=req.store._id;
            const includeHidden = String(req.query.includeHidden || '') === '1';
            let query = Product.find({ store: storeId }).select('_id productHandle productTitle stats isDeleted deletedAt createdAt');
            if (includeHidden) {
                query = query.setOptions({ includeDeleted: true });
            }
            const products = await query.sort({ createdAt: -1 });

            res.status(200).json({
                data: products,
                message: products.length === 0 ? "No products found for this store" : "Products fetched successfully"
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

        // Layout performance: count embed loads (throttled)
        recordWidgetImpression(req, req.store);
        
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

            await logActivity({
                storeId,
                actorId: req.user?._id,
                action: 'review.reply',
                targetType: 'review',
                targetId: String(reviewId),
            }); 


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
            // default: live reviews; soft-hidden excluded by middleware
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

        review.isDeleted = true;
        review.deletedAt = new Date();
        await review.save();
        await recalculateProductStats(review.product);

        await logActivity({
            storeId,
            actorId: req.user?._id,
            action: 'review.hide',
            targetType: 'review',
            targetId: String(reviewId),
        });

        return res.status(200).json({
            data: review,
            message:
                'Review hidden from your storefront. It stays in Moderation so you can unhide — it is not deleted.',
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

        await logActivity({
            storeId,
            actorId: req.user?._id,
            action: 'review.unhide',
            targetType: 'review',
            targetId: String(reviewId),
        });

        return res.status(200).json({
            data: review,
            message: 'Review is visible on your storefront again.',
        });
    } catch (error) {
        console.error('unhideReview', error);
        return res.status(500).json({ message: 'Failed to unhide review.' });
    }
};

const unescapeXml = (v) =>
    String(v ?? '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');

const tagValue = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? unescapeXml(m[1].trim()) : '';
};

/** Parse EchoStream XML or JSON review payloads into normalized rows. */
const parseReviewImportPayload = (raw, mimeHint = '') => {
    const text = String(raw || '').trim();
    if (!text) return [];

    const looksJson =
        text.startsWith('{') ||
        text.startsWith('[') ||
        String(mimeHint).includes('json');

    if (looksJson) {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.reviews)
              ? parsed.reviews
              : [];
        return list.map((r) => ({
            productHandle: String(r.productHandle || r.handle || '').trim(),
            productTitle: String(r.productTitle || r.title || r.productHandle || '').trim(),
            customerName: String(r.customerName || r.name || '').trim(),
            customerEmail: String(r.customerEmail || r.email || '').trim(),
            rating: Number(r.rating),
            comment: String(r.comment || r.body || '').trim(),
            status: ['pending', 'approved', 'rejected'].includes(r.status) ? r.status : 'approved',
            isDeleted: r.hidden === true || r.hidden === 'true' || r.isDeleted === true,
            isVerifiedBuyer: r.verifiedBuyer === true || r.isVerifiedBuyer === true,
            createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
            externalId: r.externalId || r.id ? `import:${String(r.externalId || r.id)}` : null,
        }));
    }

    const blocks = text.match(/<review>[\s\S]*?<\/review>/gi) || [];
    return blocks.map((block) => {
        const id = tagValue(block, 'id');
        const hidden = tagValue(block, 'hidden').toLowerCase() === 'true';
        const verified = tagValue(block, 'verifiedBuyer').toLowerCase() === 'true';
        const statusRaw = tagValue(block, 'status');
        const createdRaw = tagValue(block, 'createdAt');
        return {
            productHandle: tagValue(block, 'productHandle'),
            productTitle: tagValue(block, 'productTitle'),
            customerName: tagValue(block, 'customerName'),
            customerEmail: tagValue(block, 'customerEmail'),
            rating: Number(tagValue(block, 'rating')),
            comment: tagValue(block, 'comment'),
            status: ['pending', 'approved', 'rejected'].includes(statusRaw) ? statusRaw : 'approved',
            isDeleted: hidden,
            isVerifiedBuyer: verified,
            createdAt: createdRaw ? new Date(createdRaw) : undefined,
            externalId: id ? `import:${id}` : null,
        };
    });
};

/** Download reviews as XML (includes hidden — for merchant records / round-trip import). */
const exportReviewsXml = async (req, res) => {
    try {
        const storeId = req.store._id;
        const productId = req.query.productId || null;
        const filter = { store: storeId };
        if (productId) filter.product = productId;

        const reviews = await Review.find(filter)
            .setOptions({ includeDeleted: true })
            .sort({ createdAt: -1 })
            .limit(5000)
            .lean();

        const productIds = [...new Set(reviews.map((r) => String(r.product)).filter(Boolean))];
        const products = await Product.find({ _id: { $in: productIds } })
            .setOptions({ includeDeleted: true })
            .select('_id productHandle productTitle')
            .lean();
        const productMap = Object.fromEntries(products.map((p) => [String(p._id), p]));

        const esc = (v) =>
            String(v ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

        const body = reviews
            .map((r) => {
                const p = productMap[String(r.product)] || {};
                return `  <review>
    <id>${esc(r._id)}</id>
    <productHandle>${esc(p.productHandle || '')}</productHandle>
    <productTitle>${esc(r.productTitle || p.productTitle || '')}</productTitle>
    <customerName>${esc(r.customerName)}</customerName>
    <customerEmail>${esc(r.customerEmail)}</customerEmail>
    <rating>${esc(r.rating)}</rating>
    <status>${esc(r.status)}</status>
    <hidden>${r.isDeleted ? 'true' : 'false'}</hidden>
    <verifiedBuyer>${r.isVerifiedBuyer ? 'true' : 'false'}</verifiedBuyer>
    <comment>${esc(r.comment)}</comment>
    <createdAt>${esc(r.createdAt?.toISOString?.() || r.createdAt)}</createdAt>
  </review>`;
            })
            .join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<echoStreamReviews storeId="${esc(storeId)}" exportedAt="${esc(new Date().toISOString())}" count="${reviews.length}">
${body}
</echoStreamReviews>
`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="echostream-reviews-${String(storeId).slice(-6)}.xml"`
        );
        return res.status(200).send(xml);
    } catch (error) {
        console.error('exportReviewsXml', error);
        return res.status(500).json({ message: 'Failed to export reviews.' });
    }
};

/**
 * Import reviews from XML (EchoStream export) or JSON.
 * Reuses products by handle (including hidden) so history cannot be wiped by re-import.
 */
const importReviews = async (req, res) => {
    try {
        const storeId = req.store._id;
        const raw =
            req.file?.buffer?.toString('utf8') ||
            (typeof req.body?.payload === 'string' ? req.body.payload : '') ||
            (typeof req.body?.xml === 'string' ? req.body.xml : '') ||
            '';

        let rows;
        try {
            rows = parseReviewImportPayload(raw, req.file?.mimetype || req.body?.format || '');
        } catch (parseErr) {
            return res.status(400).json({
                message: 'Could not parse import file. Use EchoStream XML export or a JSON reviews array.',
                detail: parseErr.message,
            });
        }

        if (!rows.length) {
            return res.status(400).json({ message: 'No reviews found in the import file.' });
        }
        if (rows.length > 2000) {
            return res.status(400).json({ message: 'Import is limited to 2000 reviews per file.' });
        }

        let imported = 0;
        let skipped = 0;
        let failed = 0;
        const touchedProducts = new Set();
        const errors = [];

        for (const row of rows) {
            const handle = row.productHandle || row.productTitle;
            if (!handle || !row.customerName || !row.comment || !(row.rating >= 1 && row.rating <= 5)) {
                failed += 1;
                errors.push('Skipped a row with missing handle, name, comment, or invalid rating.');
                continue;
            }

            try {
                if (row.externalId) {
                    const existing = await Review.findOne({
                        store: storeId,
                        source: 'native',
                        externalId: row.externalId,
                    }).setOptions({ includeDeleted: true });
                    if (existing) {
                        skipped += 1;
                        continue;
                    }
                }

                const review = await createReviewWithDiscovery(storeId, {
                    productHandle: handle,
                    productTitle: row.productTitle || handle,
                    customerName: row.customerName,
                    customerEmail: row.customerEmail || undefined,
                    rating: row.rating,
                    comment: row.comment,
                    isVerifiedBuyer: row.isVerifiedBuyer,
                    isDeleted: row.isDeleted,
                    status: row.status,
                    source: 'native',
                    externalId: row.externalId || null,
                    createdAt: row.createdAt && !Number.isNaN(row.createdAt.getTime()) ? row.createdAt : undefined,
                });

                touchedProducts.add(String(review.product));
                imported += 1;
            } catch (err) {
                failed += 1;
                if (errors.length < 8) {
                    errors.push(err.message || 'Failed to import a review.');
                }
            }
        }

        await Promise.all([...touchedProducts].map((pid) => recalculateProductStats(pid)));

        await logActivity({
            storeId,
            actorId: req.user?._id,
            action: 'review.import',
            targetType: 'store',
            targetId: String(storeId),
            meta: { imported, skipped, failed, total: rows.length },
        });

        return res.status(200).json({
            data: { imported, skipped, failed, total: rows.length, errors: errors.slice(0, 5) },
            message: `Imported ${imported} review(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ''}${failed ? `, ${failed} failed` : ''}.`,
        });
    } catch (error) {
        console.error('importReviews', error);
        return res.status(500).json({ message: 'Failed to import reviews.' });
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

export {
    createReview,
    getStoreProducts,
    getPublicProductReviews,
    merchantReplyToReview,
    getReviews,
    hideReview,
    unhideReview,
    bulkHideByRating,
    exportReviewsXml,
    importReviews,
};
