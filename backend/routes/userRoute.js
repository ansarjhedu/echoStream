import { Router } from "express";
import { registerUser,loginUser,logoutUser, refreshToken, updateUserCredentials, generateTicket, getTickets,replyToAdmin, verifyOTP, resendOTP, inviteStaff, resendInvite, acceptInvite, getStaffMembers, updateStaffPermissions, revokeStaffAccess, getOwnerNavBadges, requestLoginOtp, verifyLoginOtp, requestPasswordReset, resetPasswordWithOtp, googleAuthLogin} from "../controllers/userController.js";
import { chatWithSupportBot, escalateChatToHuman } from "../controllers/aiController.js";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notificationController.js";
import { authUser, checkPermission } from "../middlewares/authUser.js";
import { authLimiter } from "../middlewares/authLimiter.js";
import { upload } from "../utils/cloudinary.js";

const userRouter=Router();

userRouter.post("/register", authLimiter, registerUser);
userRouter.post("/login", authLimiter, loginUser);
userRouter.post("/auth/google", authLimiter, googleAuthLogin);
userRouter.post("/logout",logoutUser);
userRouter.post("/refresh",refreshToken);
userRouter.post("/verify-otp", authLimiter, verifyOTP);
userRouter.post("/resend-otp", authLimiter, resendOTP);
userRouter.post("/login-otp/request", authLimiter, requestLoginOtp);
userRouter.post("/login-otp/verify", authLimiter, verifyLoginOtp);
userRouter.post("/forgot-password", authLimiter, requestPasswordReset);
userRouter.post("/reset-password", authLimiter, resetPasswordWithOtp);
userRouter.post("/invite-staff", authUser, inviteStaff);
userRouter.post("/accept-invite", authLimiter, acceptInvite);
userRouter.get('/staff', authUser, getStaffMembers);
userRouter.post('/staff/:id/resend-invite', authUser, resendInvite);
userRouter.patch('/staff/:id/permissions', authUser, updateStaffPermissions);
userRouter.delete('/staff/:id', authUser, revokeStaffAccess);
userRouter.get('/nav-badges', authUser, getOwnerNavBadges);
userRouter.get('/notifications', authUser, listNotifications);
userRouter.patch('/notifications/read-all', authUser, markAllNotificationsRead);
userRouter.patch('/notifications/:id/read', authUser, markNotificationRead);

userRouter.put("/update",authUser,upload.single("profilePic"),updateUserCredentials);

userRouter.post("/support/create",authUser,checkPermission('tickets'),upload.array("images", 3),generateTicket);
userRouter.get("/support/list",authUser,checkPermission('tickets'),getTickets);
userRouter.post('/support/:id/reply', authUser,checkPermission('tickets'),upload.array('images',3),replyToAdmin)

userRouter.post('/assistant/chat', authUser, authLimiter, chatWithSupportBot);
userRouter.post('/assistant/escalate', authUser, authLimiter, escalateChatToHuman);

export default userRouter;
