import Product from "../models/Product.js";
import Review from "../models/Review.js";

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
        const review=await Review.create({
            product:product._id,
            productTitle:reviewData.productTitle,
            store:storeId,
            customerName:reviewData.customerName,
            customerEmail: reviewData.customerEmail,
            rating:reviewData.rating,
            comment:reviewData.comment,
            status:"approved", // default status for new reviews
            images: reviewData.images || [],
        });
        return review;
        

        }catch (error) {
        console.error("Error in createReviewWithDiscovery",error);
        throw new Error("Failed to create review with discovery");
    }
}

const recalculateProductStats = async (productId) => {
    // Aggregation Pipeline: Math done at the Database level
    const stats = await Review.aggregate([
        { $match: { product: productId, status: "approved" } },
        {
            $group: {
                _id: "$product",
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    // If no reviews left (all deleted), reset to 0
    const finalStats = stats.length > 0 
        ? { avgRating: Math.round(stats[0].avgRating * 10) / 10, totalReviews: stats[0].totalReviews }
        : { avgRating: 0, totalReviews: 0 };

    await Product.findByIdAndUpdate(productId, { stats: finalStats });
};

export { createReviewWithDiscovery, recalculateProductStats };
