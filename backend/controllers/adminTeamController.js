import crypto from "crypto";
import User from "../models/User.js";
import Token from "../models/Token.js";
import Support from "../models/Support.js";
import Review from "../models/Review.js";
import sendEmail from "../utils/sendEmail.js";

const PLATFORM_PERMISSIONS = [
    'stores_read',
    'users_read',
    'disputes_resolve',
    'support_queue',
    'analytics_platform',
    'moderation',
    'settings',
];

const PLATFORM_ROLE_PRESETS = {
    administrator: [
        'stores_read',
        'users_read',
        'disputes_resolve',
        'support_queue',
        'analytics_platform',
        'moderation',
        'settings',
    ],
    editor: ['stores_read', 'moderation', 'disputes_resolve', 'analytics_platform'],
    support: ['support_queue'],
};

const ALLOWED_STORE_ROLES = ['administrator', 'editor', 'support', 'custom'];

const resolvePlatformPermissions = (storeRole, permissions) => {
    if (storeRole !== 'custom') {
        if (!PLATFORM_ROLE_PRESETS[storeRole]) throw new Error('Invalid storeRole');
        return [...PLATFORM_ROLE_PRESETS[storeRole]];
    }
    const safe = Array.isArray(permissions)
        ? [...new Set(permissions.filter((p) => PLATFORM_PERMISSIONS.includes(p)))]
        : [];
    if (safe.length === 0) throw new Error('Custom role requires at least one valid platform permission');
    return safe;
};

const buildInviteEmailHtml = ({ userName, ownerName, inviteUrl, storeRole }) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 10px; background-color: #0A0F1A; color: #fff;">
      <h2 style="color: #ef4444; text-align: center;">EchoStream Platform Team Invite</h2>
      <p style="color: #ccc;">Hi ${userName},</p>
      <p style="color: #ccc;">You've been invited to join <strong style="color:#fff;">${ownerName}</strong>'s Platform Admin team as <strong style="color:#f87171;">${storeRole}</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="display:inline-block; background: linear-gradient(90deg,#ef4444,#f97316); color:#fff; text-decoration:none; font-weight:bold; padding:14px 28px; border-radius:12px;">Accept Invitation &amp; Set Password</a>
      </div>
      <p style="color: #888; font-size: 12px;">This link expires in 24 hours.<br/><span style="color:#f87171; word-break:break-all;">${inviteUrl}</span></p>
  </div>
`;

const invitePlatformStaff = async (req, res) => {
    try {
        const { email, userName, storeRole, permissions } = req.body;
        if (!email || !userName) {
            return res.status(400).json({ message: "Email and userName are required" });
        }

        const safeStoreRole = ALLOWED_STORE_ROLES.includes(storeRole) ? storeRole : 'support';
        let resolvedPermissions;
        try {
            resolvedPermissions = resolvePlatformPermissions(safeStoreRole, permissions);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }

        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const tempPassword = crypto.randomBytes(32).toString('hex');

        let user = await User.findOne({ email });

        if (user) {
            if (user.isVerified && !user.isDeleted) {
                return res.status(400).json({ message: "User already registered" });
            }
            if (user.role === 'admin' || user.role === 'owner') {
                return res.status(400).json({ message: "This email is already registered under a different role" });
            }
            if (user.parentAccount && user.parentAccount.toString() !== req.user._id.toString()) {
                return res.status(400).json({ message: "This email is already invited by another account" });
            }

            user.userName = userName;
            user.role = 'staff';
            user.permissions = resolvedPermissions;
            user.storeRole = safeStoreRole;
            user.parentAccount = req.user._id;
            user.password = tempPassword;
            user.inviteToken = inviteToken;
            user.inviteTokenExpire = inviteTokenExpire;
            user.isVerified = false;
            user.isDeleted = false;
            user.deletedAt = null;
            user.isActive = true;
            user.tokenVersion = 0;
            await user.save();
        } else {
            user = await User.create({
                email,
                userName,
                password: tempPassword,
                role: 'staff',
                storeRole: safeStoreRole,
                isVerified: false,
                parentAccount: req.user._id,
                permissions: resolvedPermissions,
                inviteToken,
                inviteTokenExpire,
                tokenVersion: 0,
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const inviteUrl = `${frontendUrl}/accept-invite?email=${encodeURIComponent(email)}&token=${inviteToken}`;

        await sendEmail({
            email: user.email,
            subject: `You've been invited to join ${req.user.userName}'s Platform Team`,
            html: buildInviteEmailHtml({
                userName,
                ownerName: req.user.userName,
                inviteUrl,
                storeRole: safeStoreRole,
            }),
        });

        return res.status(201).json({
            message: "Platform staff invitation sent successfully.",
            email: user.email,
            storeRole: user.storeRole,
            permissions: user.permissions,
        });
    } catch (error) {
        console.error("Error in invitePlatformStaff", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const getPlatformStaff = async (req, res) => {
    try {
        const status = (req.query.status || 'all').toLowerCase();
        const base = { parentAccount: req.user._id, role: 'staff' };
        let filter = { ...base };

        if (status === 'pending') filter = { ...base, isVerified: false, isDeleted: false };
        else if (status === 'accepted') filter = { ...base, isVerified: true, isDeleted: false };
        else if (status === 'revoked') filter = { ...base, isDeleted: true };

        const staff = await User.find(filter)
            .select('-password -otp -otpExpire -inviteToken')
            .sort({ createdAt: -1 });

        return res.status(200).json({ data: staff });
    } catch (error) {
        console.error("Error in getPlatformStaff", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const resendPlatformInvite = async (req, res) => {
    try {
        const staff = await User.findOne({
            _id: req.params.id,
            parentAccount: req.user._id,
            role: 'staff',
            isVerified: false,
            isDeleted: false,
        }).select('+inviteToken +inviteTokenExpire');

        if (!staff) {
            return res.status(404).json({ message: "Pending platform invitation not found" });
        }

        const inviteToken = crypto.randomBytes(32).toString('hex');
        staff.inviteToken = inviteToken;
        staff.inviteTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await staff.save();

        const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const inviteUrl = `${frontendUrl}/accept-invite?email=${encodeURIComponent(staff.email)}&token=${inviteToken}`;

        await sendEmail({
            email: staff.email,
            subject: `You've been invited to join ${req.user.userName}'s Platform Team`,
            html: buildInviteEmailHtml({
                userName: staff.userName,
                ownerName: req.user.userName,
                inviteUrl,
                storeRole: staff.storeRole,
            }),
        });

        return res.status(200).json({ message: "Invitation resent successfully." });
    } catch (error) {
        console.error("Error in resendPlatformInvite", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const updatePlatformStaffPermissions = async (req, res) => {
    try {
        const { storeRole, permissions } = req.body;
        const safeStoreRole = ALLOWED_STORE_ROLES.includes(storeRole) ? storeRole : null;
        if (!safeStoreRole) return res.status(400).json({ message: "Invalid storeRole" });

        let resolvedPermissions;
        try {
            resolvedPermissions = resolvePlatformPermissions(safeStoreRole, permissions);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }

        const staff = await User.findOne({
            _id: req.params.id,
            parentAccount: req.user._id,
            role: 'staff',
            isDeleted: false,
        });

        if (!staff) {
            return res.status(404).json({ message: "Platform staff not found" });
        }

        staff.storeRole = safeStoreRole;
        staff.permissions = resolvedPermissions;
        staff.tokenVersion = (staff.tokenVersion || 0) + 1;
        await staff.save();
        await Token.deleteMany({ user: staff._id });

        return res.status(200).json({
            message: "Platform staff permissions updated. They must sign in again.",
            data: staff,
        });
    } catch (error) {
        console.error("Error in updatePlatformStaffPermissions", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const revokePlatformStaff = async (req, res) => {
    try {
        const staff = await User.findOne({
            _id: req.params.id,
            parentAccount: req.user._id,
            role: 'staff',
            isDeleted: false,
        });

        if (!staff) {
            return res.status(404).json({ message: "Platform staff not found" });
        }

        staff.isDeleted = true;
        staff.deletedAt = Date.now();
        staff.isActive = false;
        staff.tokenVersion = (staff.tokenVersion || 0) + 1;
        await staff.save();
        await Token.deleteMany({ user: staff._id });

        return res.status(200).json({ message: "Platform staff access revoked", data: staff });
    } catch (error) {
        console.error("Error in revokePlatformStaff", error);
        return res.status(500).json({ message: "Server error" });
    }
};

/** Badges for admin sidebar: unread pending tickets + disputes (optionally since last viewed). */
const getAdminNavBadges = async (req, res) => {
    try {
        const ticketFilter = { status: 'open' };
        const disputeFilter = { status: 'disputed', isDeleted: false };

        if (req.query.ticketsSince) {
            const d = new Date(req.query.ticketsSince);
            if (!Number.isNaN(d.getTime())) ticketFilter.createdAt = { $gt: d };
        }
        if (req.query.disputesSince) {
            const d = new Date(req.query.disputesSince);
            if (!Number.isNaN(d.getTime())) {
                disputeFilter.$or = [
                    { 'disputedReason.createdAt': { $gt: d } },
                    { createdAt: { $gt: d }, 'disputedReason.createdAt': { $exists: false } },
                ];
            }
        }

        const [openTickets, openDisputes] = await Promise.all([
            Support.countDocuments(ticketFilter),
            Review.countDocuments(disputeFilter),
        ]);
        return res.status(200).json({
            data: { openTickets, openDisputes },
        });
    } catch (error) {
        console.error("Error in getAdminNavBadges", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export {
    invitePlatformStaff,
    getPlatformStaff,
    resendPlatformInvite,
    updatePlatformStaffPermissions,
    revokePlatformStaff,
    getAdminNavBadges,
    PLATFORM_ROLE_PRESETS,
    PLATFORM_PERMISSIONS,
};
