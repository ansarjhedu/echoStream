import { createReviewWithDiscovery, recalculateProductStats } from "../services/reviewService.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

const createReview=async(req,res)=>{

    try {
        const { productHandle, productTitle, customerName, customerEmail, rating, comment, }=req.body;
        console.log(customerName)
        if(!productHandle || !productTitle || !customerName || !customerEmail || !rating || !comment){
            return res.status(400).json({ message: "All fields are required" });
        }

        if(["fuck", "shit", "damn"].includes(comment.toLowerCase())){
            return res.status(400).json({ message: "Inappropriate language used in comment" });
        }
        //get image paths from multer (if any)
         const imagePaths = req.files ? req.files.map(file => file.path) : [];

         // Prepare review data with image paths
        const reviewData={
            productHandle,
            productTitle,
            customerName,
            customerEmail, 
            rating,
            comment,
            images: imagePaths
        }
    
        const review=await createReviewWithDiscovery(req.store._id, reviewData);
        res.status(201).json(review);
    } catch (error) {
        console.error("Error in createReview controller",error.message);
        res.status(500).json({ message: "Failed to create review" });
    }   
};

const updateReviewStatus = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { status } = req.body;
        const storeId=req.store._id;

        if(!["disputed","approved","rejected"].includes(status)){
            return res.status(400).json({message:" Invalid status "});
        }

      // 1. Update the review status and increment dispute count
      const review=await Review.findOne({ _id: reviewId, store: storeId });
      if(!review ||  review.disputeCount>=3 ){
        return res.status(404).json({message:"Review not found or cannot be disputed anymore"});
      }

      if(review.customerEmail && (review.customerEmail.endsWith("@example.com") )){

        review.status=status;
        review.disputeCount+=1;
        await review.save();
        // 4. Trigger Recalculation
        await recalculateProductStats(review.product);
          
        res.status(200).json({ message: "Review status updated successfully", data: review });
    } 
}catch (error) {
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

        // 1. Find the product ID first
        const product = await Product.findOne({ store: storeId, productHandle });
       if (!product) {
            return res.status(200).json({ 
                message: "No reviews yet", 
                data:[],
                stats: { avgRating: 0, totalReviews: 0 },
                widgetConfig: req.store.widgetConfig
            });
        }

        // 2. Fetch Approved Reviews
        const reviews = await Review.find({ 
            product: product._id, 
            status: 'approved' // SECURITY: Only show approved reviews
        })
        .sort({ createdAt: -1 })
        .select('customerName rating comment createdAt merchantReply images'); // Select specific fields

         const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => distribution[r.rating]++);

        res.status(200).json({ 
            productTitle: product.productTitle,
            stats: {
                avgRating: product.stats?.avgRating || 0,
                totalReviews: product.stats?.totalReviews || 0,
                distribution: distribution // Required for Classic Layout progress bars
            },
            widgetConfig: req.store.widgetConfig, 
            data: reviews ,
            message: "Reviews fetched successfully"
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
        // If a specific product is clicked, filter by it
        if (req.query.productId) {
            filter.product = req.query.productId;
        }
        const reviews = await Review.find(filter).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch admin reviews" });
    }
};



export { createReview, updateReviewStatus, getStoreProducts, getPublicProductReviews, merchantReplyToReview, getReviews }; // <-- Export it