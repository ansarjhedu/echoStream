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
        let { status } = req.body;
        const storeId = req.store._id;

        

        if (!["approved", "rejected", "disputed"].includes(status)) {
            return res.status(400).json({ message: "Invalid status provided." });
        }

        // 1. Find the review
        const review = await Review.findOne({ _id: reviewId, store: storeId });
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        // 2. SECURITY: Admin Lock Check
        if (review.isLocked) {
            return res.status(403).json({ message: "This review is permanently locked by Platform Admin." });
        }

        // 3. Determine if the review is from a Verified Buyer (they have an email)
        const isVerifiedBuyer = review.customerEmail && review.customerEmail.trim() !== "";

        if (isVerifiedBuyer) {
            // ---------------------------------------------------
            // VERIFIED BUYER LOGIC (Owner can ONLY Dispute)
            // ---------------------------------------------------
            if (status !== "dispute") {
                return res.status(403).json({ message: "Verified customer reviews can only be disputed. Admins handle approvals/rejections." });
            }
            
            // Check the 3-Strike Rule
            if (review.disputeCount >= 3) {
                return res.status(403).json({ message: "Dispute limit reached. You cannot dispute this review anymore." });
            }

            review.status = "dispute";
            review.disputeCount = (review.disputeCount || 0) + 1;

        } else {
            // ---------------------------------------------------
            // GUEST BUYER LOGIC (Owner has full control)
            // ---------------------------------------------------
            if (!["approved", "rejected"].includes(status)) {
                return res.status(400).json({ message: "Guest reviews can only be approved or rejected." });
            }
            review.status = status;
        }

        // 4. Save and Recalculate
        await review.save();
        await recalculateProductStats(review.product);
          
        return res.status(200).json({ 
            message: `Review status updated to ${review.status} successfully`, 
            data: review 
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