import { Router } from "express";
import {authUser,authStore} from "../middlewares/authUser.js";
import { createStore, myStores,getStoreById,updateStoreStatus,getStoreAnalytics } from "../controllers/storeController.js";
import { updateReviewStatus, getStoreProducts, merchantReplyToReview, getReviews } from "../controllers/reviewController.js";



const storeRouter=Router();



storeRouter.post('/create',authUser,createStore)
storeRouter.get('/mystores',authUser,myStores)
storeRouter.get('/:id',authUser,authStore,getStoreById);
storeRouter.patch('/:id/status',authUser,authStore,updateStoreStatus);
storeRouter.get('/:id/analytics', authUser, authStore, getStoreAnalytics);

storeRouter.get('/:id/products',authUser,authStore,getStoreProducts);
storeRouter.patch('/:id/updateReview/:reviewId/status',authUser,authStore,updateReviewStatus);
storeRouter.get('/:id/reviews',authUser,authStore,getReviews);
storeRouter.post('/:id/reviews/:reviewId/reply',authUser,authStore,merchantReplyToReview);



export default storeRouter;