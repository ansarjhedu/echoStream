import { Router } from "express";
import apiKeyAuth from "../middlewares/apiKeyAuth.js";
import { createReview ,getPublicProductReviews} from "../controllers/reviewController.js";
import { upload } from "../utils/cloudinary.js";
import { reviewLimiter } from "../middlewares/authLimiter.js";

const publicRouter=Router();

publicRouter.post('/reviews/add',reviewLimiter, apiKeyAuth, upload.array('images', 3), createReview);
publicRouter.get('/products/:productHandle/reviews', apiKeyAuth, getPublicProductReviews);



export default publicRouter;