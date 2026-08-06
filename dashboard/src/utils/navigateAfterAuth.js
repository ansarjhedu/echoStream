/**
 * After login/OTP, fetch stores and route owners to Presence vs Commerce hubs.
 */
import api from '../Api';
import {
  resolveOwnerHubPath,
  getPostLoginPath,
  canAccessAdminPortal,
  classifyWorkspaceMode,
  persistWorkspaceMode,
} from './permissionHelpers';

export async function navigateAfterAuth(user, navigate) {
  if (!user) {
    navigate('/login', { replace: true });
    return;
  }
  if (canAccessAdminPortal(user) || user.role === 'staff') {
    navigate(getPostLoginPath(user), { replace: true });
    return;
  }
  try {
    const res = await api.get('/store/mystores');
    const stores = res.data.data || [];
    persistWorkspaceMode(classifyWorkspaceMode(stores));
    navigate(resolveOwnerHubPath(user, stores), { replace: true });
  } catch {
    navigate(getPostLoginPath(user), { replace: true });
  }
}
