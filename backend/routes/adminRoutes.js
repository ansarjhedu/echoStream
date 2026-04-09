import { Router } from "express";
import {authAdmin} from "../middlewares/authUser.js";
import {listUsers,listStores,deleteUser,updateStore,getPlatformAnalytics, getDisputedReviews, resolveDispute,restoreStore,restoreUser} from '../controllers/adminController.js';
const adminRouter=Router();


adminRouter.get('/store/list',authAdmin,listStores);
adminRouter.get('/user/list',authAdmin,listUsers);
adminRouter.patch('/user/:id',authAdmin,deleteUser);
adminRouter.patch('/store/:id/status',authAdmin,updateStore);

adminRouter.get('/analytics', authAdmin, getPlatformAnalytics);
adminRouter.get('/disputes', authAdmin, getDisputedReviews);
adminRouter.patch('/disputes/:reviewId/resolve', authAdmin, resolveDispute);
adminRouter.patch('/store/:id/restore', authAdmin, restoreStore);
adminRouter.patch('/user/:id/restore', authAdmin, restoreUser);





export default adminRouter;