import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Store from "../models/Store.js";

const STORE_SCOPED_PERMISSIONS = ['moderation', 'products', 'integrations', 'settings', 'disputes'];
const PLATFORM_IMPERSONATION_PERMS = ['stores_read', 'moderation', 'settings', 'analytics_platform'];

const resolveStaffScope = (user, parent) => {
    if (user.role !== 'staff') return null;
    if (parent?.role === 'admin') return 'platform';
    if (parent?.role === 'owner') return 'store';
    return null;
};

const authUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided, authorization denied" });
    }
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Invalid token, authorization denied" });
        }

        const user = await User.findById(decoded.userId);
        if (!user || user.isDeleted || user.isActive === false) {
            return res.status(401).json({ message: "Account deactivated" });
        }

        if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
            return res.status(401).json({ message: "Session invalidated" });
        }

        let parent = null;
        let staffScope = null;

        if (user.role === 'staff') {
            if (!user.parentAccount) {
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
            parent = await User.findById(user.parentAccount).select('isDeleted isActive role');
            if (!parent || parent.isDeleted || parent.isActive === false) {
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
            staffScope = resolveStaffScope(user, parent);
        }

        req.user = {
            _id: user._id,
            role: user.role,
            storeRole: user.storeRole || 'support',
            userName: user.userName,
            email: user.email,
            permissions: user.permissions || [],
            parentAccount: user.parentAccount || null,
            parentRole: parent?.role || null,
            staffScope,
            tokenVersion: user.tokenVersion || 0
        };
        next();
    } catch (error) {
        console.error("Token verification failed", error);
        return res.status(401).json({ message: "Invalid token, authorization denied" });
    }
};

const authStore = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const role = req.user.role;
        const storeId = req.params.id;

        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(401).json({ message: "Store not found, authorization denied" });
        }

        const isMasterAdmin = role === 'admin';
        const isOwner = role === 'owner' && store.owner.toString() === userId.toString();
        const isStoreStaff =
            role === 'staff' &&
            req.user.staffScope === 'store' &&
            req.user.parentAccount &&
            store.owner.toString() === req.user.parentAccount.toString();

        const isPlatformStaff =
            role === 'staff' &&
            req.user.staffScope === 'platform' &&
            (req.user.permissions || []).some((p) => PLATFORM_IMPERSONATION_PERMS.includes(p));

        if (isMasterAdmin || isOwner || isStoreStaff || isPlatformStaff) {
            req.store = store;
            req.impersonation = {
                mode: isMasterAdmin ? 'admin' : isPlatformStaff ? 'platform' : isStoreStaff ? 'store_staff' : 'owner'
            };
            return next();
        }

        return res.status(401).json({ message: "You do not have permission to access this store" });
    } catch (error) {
        console.error("Store verification failed", error);
        return res.status(401).json({ message: "Store verification failed, authorization denied" });
    }
};

/** Owner / Master admin pass; staff need matching permission (store or platform). */
const checkPermission = (requiredPermission) => {
    const required = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

    return (req, res, next) => {
        try {
            const { role, permissions = [] } = req.user || {};

            if (role === 'owner' || role === 'admin') {
                return next();
            }

            if (role === 'staff' && required.some((perm) => permissions.includes(perm))) {
                return next();
            }

            return res.status(403).json({
                message: `Insufficient permissions. One of [${required.join(', ')}] is required.`
            });
        } catch (error) {
            console.error("Permission check failed", error);
            return res.status(403).json({ message: "Permission check failed, authorization denied" });
        }
    };
};

const checkStoreScopedAccess = (req, res, next) => {
    try {
        const { role, permissions = [], staffScope } = req.user || {};

        if (role === 'owner' || role === 'admin') {
            return next();
        }

        if (role === 'staff' && staffScope === 'store' && permissions.some((p) => STORE_SCOPED_PERMISSIONS.includes(p))) {
            return next();
        }

        if (role === 'staff' && staffScope === 'platform' && permissions.some((p) => PLATFORM_IMPERSONATION_PERMS.includes(p))) {
            return next();
        }

        return res.status(403).json({
            message: "Store-scoped access required. Support-only accounts cannot access analytics."
        });
    } catch (error) {
        console.error("Store-scoped access check failed", error);
        return res.status(403).json({ message: "Authorization denied" });
    }
};

/** Master admin OR platform staff (scoped god-mode). */
const authAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided, authorization denied" });
    }
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Invalid token, authorization denied" });
        }

        const user = await User.findById(decoded.userId);
        if (!user || user.isDeleted || user.isActive === false) {
            return res.status(401).json({ message: "Account deactivated" });
        }
        if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
            return res.status(401).json({ message: "Session invalidated" });
        }

        if (user.role === 'admin') {
            req.user = {
                _id: user._id,
                role: user.role,
                userName: user.userName,
                email: user.email,
                permissions: user.permissions || [],
                staffScope: null,
                parentAccount: null,
                parentRole: null,
            };
            return next();
        }

        if (user.role === 'staff' && user.parentAccount) {
            const parent = await User.findById(user.parentAccount).select('isDeleted isActive role');
            if (!parent || parent.isDeleted || parent.isActive === false || parent.role !== 'admin') {
                return res.status(401).json({ message: "Invalid token or insufficient permissions, authorization denied" });
            }
            req.user = {
                _id: user._id,
                role: user.role,
                storeRole: user.storeRole,
                userName: user.userName,
                email: user.email,
                permissions: user.permissions || [],
                staffScope: 'platform',
                parentAccount: user.parentAccount,
                parentRole: 'admin',
            };
            return next();
        }

        return res.status(401).json({ message: "Invalid token or insufficient permissions, authorization denied" });
    } catch (error) {
        console.error("Token verification failed", error);
        return res.status(401).json({ message: "Invalid token, authorization denied" });
    }
};

/** Master Super Admin only — suspend/delete/team invites. */
const requireMasterAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ message: "Only the Master Super Admin can perform this action." });
};

/** Platform permission gate (Master admin bypasses). */
const checkPlatformPermission = (requiredPermission) => {
    const required = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

    return (req, res, next) => {
        if (req.user?.role === 'admin') return next();
        if (
            req.user?.role === 'staff' &&
            req.user?.staffScope === 'platform' &&
            required.some((p) => (req.user.permissions || []).includes(p))
        ) {
            return next();
        }
        return res.status(403).json({
            message: `Insufficient platform permissions. One of [${required.join(', ')}] is required.`
        });
    };
};

export {
    authUser,
    authStore,
    authAdmin,
    checkPermission,
    checkStoreScopedAccess,
    requireMasterAdmin,
    checkPlatformPermission,
    STORE_SCOPED_PERMISSIONS,
    PLATFORM_IMPERSONATION_PERMS,
};
