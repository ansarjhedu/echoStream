import { Router } from "express";
import {authUser,authStore,checkPermission,checkStoreScopedAccess} from "../middlewares/authUser.js";
import { createStore, myStores,getStoreById,updateStoreStatus,getStoreAnalytics , updateWidgetConfig, getPresenceOverview, previewStoreUrl} from "../controllers/storeController.js";
import { updateReviewStatus, getStoreProducts, merchantReplyToReview, getReviews, getStoreDisputes, hideReview, unhideReview, bulkHideByRating } from "../controllers/reviewController.js";
import {
  connectGoogleReviews,
  updateGoogleReviewFilters,
  disconnectGoogleReviews,
  syncGoogleReviews,
  getGoogleReviewsStatus,
} from "../controllers/googleReviewsController.js";
import { generateSmartReply } from "../controllers/aiController.js";
import { upload } from "../utils/cloudinary.js";



const storeRouter=Router();



storeRouter.post('/create',authUser,createStore)
storeRouter.get('/mystores',authUser,myStores)
storeRouter.get('/presence/overview', authUser, getPresenceOverview)
storeRouter.post('/preview-url', authUser, previewStoreUrl)
storeRouter.get('/:id',authUser,authStore,getStoreById);
storeRouter.patch('/:id/status',authUser,authStore,updateStoreStatus);
storeRouter.get('/:id/analytics', authUser, authStore, checkStoreScopedAccess, getStoreAnalytics);
storeRouter.patch('/:id/widget-config', authUser, authStore, checkPermission(['settings', 'integrations']), updateWidgetConfig);

storeRouter.get('/:id/google-reviews', authUser, authStore, checkPermission(['integrations', 'settings']), getGoogleReviewsStatus);
storeRouter.post('/:id/google-reviews/connect', authUser, authStore, checkPermission(['integrations', 'settings']), connectGoogleReviews);
storeRouter.patch('/:id/google-reviews/filters', authUser, authStore, checkPermission(['integrations', 'settings']), updateGoogleReviewFilters);
storeRouter.post('/:id/google-reviews/sync', authUser, authStore, checkPermission(['integrations', 'settings']), syncGoogleReviews);
storeRouter.delete('/:id/google-reviews', authUser, authStore, checkPermission(['integrations', 'settings']), disconnectGoogleReviews);

storeRouter.get('/:id/products',authUser,authStore,checkPermission(['products','moderation']),getStoreProducts);
storeRouter.patch('/:id/updateReview/:reviewId/status',authUser,authStore,checkPermission('moderation'),upload.array('images', 3),updateReviewStatus);
storeRouter.get('/:id/reviews',authUser,authStore,checkPermission(['products','moderation']),getReviews);
storeRouter.patch('/:id/reviews/:reviewId/hide', authUser, authStore, checkPermission(['moderation', 'products']), hideReview);
storeRouter.patch('/:id/reviews/:reviewId/unhide', authUser, authStore, checkPermission(['moderation', 'products']), unhideReview);
storeRouter.post('/:id/reviews/bulk-hide', authUser, authStore, checkPermission(['moderation', 'products']), bulkHideByRating);
storeRouter.get('/:id/disputes',authUser,authStore,checkPermission(['moderation','disputes']),getStoreDisputes);
storeRouter.post('/:id/reviews/:reviewId/reply',authUser,authStore,checkPermission('moderation'),merchantReplyToReview);
storeRouter.post('/:id/ai/generate-reply', authUser, authStore, checkPermission('moderation'), generateSmartReply);




export default storeRouter;
