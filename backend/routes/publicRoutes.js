import { Router } from "express";
import apiKeyAuth from "../middlewares/apiKeyAuth.js";
import { createReview ,getPublicProductReviews} from "../controllers/reviewController.js";
import { upload } from "../utils/cloudinary.js";
import { reviewLimiter } from "../middlewares/authLimiter.js";
import { handlePublicUnsubscribe } from "../utils/emailCompliance.js";
import { createPublicReviewRequest } from "../controllers/reviewRequestController.js";
import { getPublicTrustPage } from "../controllers/trustController.js";

const publicRouter=Router();

publicRouter.post('/reviews/add',reviewLimiter, apiKeyAuth, upload.array('images', 3), createReview);
publicRouter.get('/products/:productHandle/reviews', apiKeyAuth, getPublicProductReviews);
publicRouter.get('/email/unsubscribe', handlePublicUnsubscribe);
publicRouter.post('/review-requests', reviewLimiter, apiKeyAuth, createPublicReviewRequest);
publicRouter.get('/trust/:slug', getPublicTrustPage);

export default publicRouter;
