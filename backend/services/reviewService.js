import Product from "../models/Product.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";

const createReviewWithDiscovery=async(storeId, reviewData)=>{
    try {
        
        // lazy discovery of Product model to avoid circular dependency
        const product= await Product.findOneAndUpdate({
            //filter product by store and productHandle to ensure uniqueness
            store:storeId,
            productHandle:reviewData.productHandle,
        },{
            $setOnInsert:{
                // if product doesn't exist, create it with the provided title
                productTitle:reviewData.productTitle,
            },
        },{
            //set upsert to true to create the product if it doesn't exist, and return the new document
            upsert:true,
            new:true,
            setDefaultsOnInsert:true,
        })
        // Lifecycle: every new submission is approved and visible on the public widget immediately.
        const review=await Review.create({
            product:product._id,
            productTitle:reviewData.productTitle,
            store:storeId,
            customerName:reviewData.customerName,
            customerEmail: reviewData.customerEmail,
            rating:reviewData.rating,
            comment:reviewData.comment,
            status: "approved",
            isVerifiedBuyer: Boolean(reviewData.isVerifiedBuyer),
            images: reviewData.images || [],
            disputeCount: 0,
        });
        return review;
        

        }catch (error) {
        console.error("Error in createReviewWithDiscovery",error);
        throw new Error("Failed to create review with discovery");
    }
}

const recalculateProductStats = async (productId) => {
    const pid =
        productId instanceof mongoose.Types.ObjectId
            ? productId
            : new mongoose.Types.ObjectId(String(productId));

    // Aggregation ignores schema pre-hooks — exclude soft-hidden reviews explicitly.
    const stats = await Review.aggregate([
        {
            $match: {
                product: pid,
                status: "approved",
                isDeleted: { $ne: true },
            },
        },
        {
            $group: {
                _id: "$product",
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    const finalStats = stats.length > 0 
        ? { avgRating: Math.round(stats[0].avgRating * 10) / 10, totalReviews: stats[0].totalReviews }
        : { avgRating: 0, totalReviews: 0 };

    await Product.findByIdAndUpdate(productId, { stats: finalStats });
};

export { createReviewWithDiscovery, recalculateProductStats };
