import { Router } from "express";
import { authAdmin, requireMasterAdmin, checkPlatformPermission } from "../middlewares/authUser.js";
import {
  listUsers, listStores, deleteUser, updateStore, getPlatformAnalytics,
  getDisputedReviews, resolveDispute, restoreStore, restoreUser,
  getTicketsFromUsers, replyToTicket, resolveTicket, claimTicket
} from '../controllers/adminController.js';
import {
  invitePlatformStaff, getPlatformStaff, resendPlatformInvite,
  updatePlatformStaffPermissions, revokePlatformStaff, getAdminNavBadges
} from '../controllers/adminTeamController.js';
import { aiResolveDispute } from '../controllers/aiController.js';

const adminRouter = Router();

// Nav badges — any platform actor
adminRouter.get('/nav-badges', authAdmin, getAdminNavBadges);

// Users — read for users_read; mutate Master only
adminRouter.get('/user/list', authAdmin, checkPlatformPermission('users_read'), listUsers);
adminRouter.patch('/user/:id', authAdmin, requireMasterAdmin, deleteUser);
adminRouter.patch('/user/:id/restore', authAdmin, requireMasterAdmin, restoreUser);

// Stores — list/read for stores_read; suspend/restore Master only
adminRouter.get('/store/list', authAdmin, checkPlatformPermission(['stores_read', 'moderation']), listStores);
adminRouter.patch('/store/:id/status', authAdmin, requireMasterAdmin, updateStore);
adminRouter.patch('/store/:id/restore', authAdmin, requireMasterAdmin, restoreStore);

// Analytics — editor+ / analytics_platform
adminRouter.get('/analytics', authAdmin, checkPlatformPermission('analytics_platform'), getPlatformAnalytics);

// Disputes
adminRouter.get('/disputes', authAdmin, checkPlatformPermission('disputes_resolve'), getDisputedReviews);
adminRouter.patch('/disputes/:reviewId/resolve', authAdmin, checkPlatformPermission('disputes_resolve'), resolveDispute);
adminRouter.post('/disputes/:reviewId/ai-resolve', authAdmin, checkPlatformPermission('disputes_resolve'), aiResolveDispute);

// Support queue
adminRouter.get('/support/list', authAdmin, checkPlatformPermission('support_queue'), getTicketsFromUsers);
adminRouter.post('/support/:id/reply', authAdmin, checkPlatformPermission('support_queue'), replyToTicket);
adminRouter.patch('/support/:id/claim', authAdmin, checkPlatformPermission('support_queue'), claimTicket);
adminRouter.patch('/support/:id/resolve', authAdmin, checkPlatformPermission('support_queue'), resolveTicket);

// Platform Team — Master Super Admin only
adminRouter.post('/team/invite', authAdmin, requireMasterAdmin, invitePlatformStaff);
adminRouter.get('/team', authAdmin, requireMasterAdmin, getPlatformStaff);
adminRouter.post('/team/:id/resend-invite', authAdmin, requireMasterAdmin, resendPlatformInvite);
adminRouter.patch('/team/:id/permissions', authAdmin, requireMasterAdmin, updatePlatformStaffPermissions);
adminRouter.delete('/team/:id', authAdmin, requireMasterAdmin, revokePlatformStaff);

export default adminRouter;
