import { Router } from "express";
import {authAdmin} from "../middlewares/authUser.js";
import {listUsers,listStores,deleteUser,updateStore,getPlatformAnalytics, getDisputedReviews, resolveDispute} from '../controllers/adminController.js';
const adminRouter=Router();


adminRouter.get('/store/list',authAdmin,listStores);
adminRouter.get('/user/list',authAdmin,listUsers);
adminRouter.delete('/user/:id',authAdmin,deleteUser);
adminRouter.patch('/store/:id/status',authAdmin,updateStore);

adminRouter.get('/analytics', authAdmin, getPlatformAnalytics);
adminRouter.get('/disputes', authAdmin, getDisputedReviews);
adminRouter.patch('/disputes/:reviewId/resolve', authAdmin, resolveDispute);




export default adminRouter;