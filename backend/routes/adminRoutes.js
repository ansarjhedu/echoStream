import { Router } from "express";
import {authAdmin} from "../middlewares/authUser.js";
import {listUsers,listStores,deleteUser,updateStore,getPlatformAnalytics, getDisputedReviews, resolveDispute,restoreStore,restoreUser, getTicketsFromUsers, replyToTicket, resolveTicket} from '../controllers/adminController.js';
const adminRouter=Router();


adminRouter.get('/user/list',authAdmin,listUsers);
adminRouter.patch('/user/:id',authAdmin,deleteUser);
adminRouter.patch('/user/:id/restore', authAdmin, restoreUser);

adminRouter.get('/store/list',authAdmin,listStores);
adminRouter.patch('/store/:id/status',authAdmin,updateStore);
adminRouter.patch('/store/:id/restore', authAdmin, restoreStore);

adminRouter.get('/analytics', authAdmin, getPlatformAnalytics);
adminRouter.get('/disputes', authAdmin, getDisputedReviews);
adminRouter.patch('/disputes/:reviewId/resolve', authAdmin, resolveDispute);

adminRouter.get('/support/list',authAdmin, getTicketsFromUsers);
adminRouter.post('/support/:id/reply', authAdmin, replyToTicket);
adminRouter.patch('/support/:id/resolve', authAdmin, resolveTicket);




export default adminRouter;