export const ROLE_PRESETS = {
  administrator: ['moderation', 'products', 'integrations', 'settings', 'disputes', 'tickets'],
  editor: ['moderation', 'products', 'integrations'],
  support: ['tickets'],
};

export const PLATFORM_ROLE_PRESETS = {
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

export const STORE_PERM_GROUPS = [
  { title: 'Store Management', keys: ['moderation', 'products', 'integrations', 'settings'] },
  { title: 'Disputes', keys: ['disputes'] },
  { title: 'Support', keys: ['tickets'] },
];

export const PLATFORM_PERM_GROUPS = [
  { title: 'Platform Access', keys: ['stores_read', 'users_read', 'analytics_platform'] },
  { title: 'Moderation & Disputes', keys: ['moderation', 'disputes_resolve', 'settings'] },
  { title: 'Support', keys: ['support_queue'] },
];

/** Signup / onboarding intent (landing CTAs → auth). */
export const SIGNUP_INTENT_KEY = 'echo_signup_intent';
export const PRESENCE_TYPES = ['blog', 'portfolio'];
export const COMMERCE_TYPE = 'ecommerce';
export const WORKSPACE_MODE_KEY = 'echo_workspace_mode';

export const setSignupIntent = (intent) => {
  if (typeof window === 'undefined') return;
  if (intent === 'presence' || intent === 'commerce') {
    sessionStorage.setItem(SIGNUP_INTENT_KEY, intent);
  }
};

export const peekSignupIntent = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SIGNUP_INTENT_KEY);
};

export const consumeSignupIntent = () => {
  if (typeof window === 'undefined') return null;
  const intent = sessionStorage.getItem(SIGNUP_INTENT_KEY);
  sessionStorage.removeItem(SIGNUP_INTENT_KEY);
  return intent;
};

export const persistWorkspaceMode = (mode) => {
  if (typeof window === 'undefined') return;
  if (mode === 'commerce' || mode === 'presence' || mode === 'empty') {
    sessionStorage.setItem(WORKSPACE_MODE_KEY, mode);
  }
};

export const peekWorkspaceMode = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(WORKSPACE_MODE_KEY);
};

export const isPresenceType = (storeType) =>
  PRESENCE_TYPES.includes(String(storeType || '').toLowerCase());

export const isCommerceType = (storeType) =>
  String(storeType || '').toLowerCase() === COMMERCE_TYPE;

export const getActiveStores = (stores = []) =>
  (stores || []).filter((s) => !s.isDeleted);

/** @returns {'commerce'|'presence'|'empty'} */
export const classifyWorkspaceMode = (stores = []) => {
  const live = getActiveStores(stores);
  if (live.some((s) => isCommerceType(s.storeType))) return 'commerce';
  if (live.some((s) => isPresenceType(s.storeType))) return 'presence';
  return 'empty';
};

/** Prefer live classification; fall back to session so Support/Team keep Presence nav. */
export const resolveHubNavMode = (stores = [], pathname = '') => {
  const live = classifyWorkspaceMode(stores);
  if (live === 'commerce' || live === 'presence') {
    persistWorkspaceMode(live);
    return live;
  }
  const cached = peekWorkspaceMode();
  if (cached === 'presence' || cached === 'commerce') return cached;
  if (String(pathname).includes('/presence') || peekSignupIntent() === 'presence') {
    return 'presence';
  }
  if (peekSignupIntent() === 'commerce') return 'commerce';
  return 'empty';
};

export const hasPerm = (user, permissionKey) => {
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'admin') return true;
  if (user.role === 'staff') {
    return Array.isArray(user.permissions) && user.permissions.includes(permissionKey);
  }
  return false;
};

export const isMasterAdmin = (user) => user?.role === 'admin';

export const isPlatformStaff = (user) =>
  user?.role === 'staff' && (user?.staffScope === 'platform' || user?.parentRole === 'admin');

export const isStoreStaff = (user) =>
  user?.role === 'staff' && (user?.staffScope === 'store' || user?.parentRole === 'owner');

/** Store support-only OR platform support-only (support_queue only). */
export const isSupportOnly = (user) => {
  if (!user || user.role !== 'staff') return false;
  if (isPlatformStaff(user)) {
    if (user.storeRole === 'support') return true;
    const perms = user.permissions || [];
    return perms.length > 0 && perms.every((p) => p === 'support_queue');
  }
  if (user.storeRole === 'support') return true;
  const perms = user.permissions || [];
  return perms.length > 0 && perms.every((p) => p === 'tickets');
};

export const getPostLoginPath = (user) => {
  if (!user) return '/login';
  if (user.role === 'admin') return '/hub/admin/overview';
  if (isPlatformStaff(user)) {
    if (isSupportOnly(user)) return '/hub/admin/support';
    if (hasPerm(user, 'analytics_platform') || hasPerm(user, 'stores_read')) {
      return '/hub/admin/overview';
    }
    if (hasPerm(user, 'disputes_resolve')) return '/hub/admin/disputes';
    if (hasPerm(user, 'support_queue')) return '/hub/admin/support';
    return '/hub/admin/overview';
  }
  if (user.role === 'staff' && isSupportOnly(user)) return '/hub/support';
  const intent = peekSignupIntent();
  if (intent === 'presence') return '/hub/presence';
  if (intent === 'commerce') return '/hub/onboarding/store';
  return '/hub/stores';
};

/**
 * Owner hub path after auth once stores are known.
 * Empty workspaces honor signup intent from the landing CTAs.
 */
export const resolveOwnerHubPath = (user, stores = []) => {
  if (!user) return '/login';
  if (user.role === 'admin' || isPlatformStaff(user)) return getPostLoginPath(user);
  if (user.role === 'staff' && isSupportOnly(user)) return '/hub/support';

  const mode = classifyWorkspaceMode(stores);
  if (mode === 'commerce') return '/hub/stores';
  if (mode === 'presence') return '/hub/presence';

  const intent = peekSignupIntent();
  if (intent === 'presence') return '/hub/presence';
  if (intent === 'commerce') return '/hub/onboarding/store';
  const cached = peekWorkspaceMode();
  if (cached === 'presence') return '/hub/presence';
  if (cached === 'commerce') return '/hub/stores';
  return '/hub/stores';
};

export const getWorkspaceFallbackPath = (user) => {
  if (isPlatformStaff(user)) return getPostLoginPath(user);
  if (isSupportOnly(user)) return '/hub/support';
  if (hasPerm(user, 'moderation') || hasPerm(user, 'products')) return '/workspace/reviews';
  if (hasPerm(user, 'integrations')) return '/workspace/widgets';
  return getPostLoginPath(user);
};

export const getDaysLeft = (deletedAt, graceDays = 30) => {
  if (!deletedAt) return null;
  const end = new Date(deletedAt).getTime() + graceDays * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
};

export const canAccessAdminPortal = (user) =>
  isMasterAdmin(user) || isPlatformStaff(user);

/** Widget Catalog, Design Lab, Google Reviews — integrations (or settings). */
export const canManageWidgets = (user) =>
  hasPerm(user, 'integrations') || hasPerm(user, 'settings');
