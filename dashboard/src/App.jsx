import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  getPostLoginPath,
  hasPerm,
  getWorkspaceFallbackPath,
  isSupportOnly,
  isMasterAdmin,
  isPlatformStaff,
  canAccessAdminPortal,
  isPresenceType,
} from './utils/permissionHelpers';
import { navigateAfterAuth } from './utils/navigateAfterAuth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import StoresHub from './pages/StoresHub';
import PresenceOverview from './pages/PresenceOverview';
import StoreOnboarding from './pages/StoreOnboarding';
import Profile from './pages/Profile';
import Reviews from './pages/Reviews';
import Integration from './pages/Integration';
import WidgetCatalog from './pages/WidgetCatalog';
import DesignLab from './pages/DesignLab';
import GoogleReviews from './pages/GoogleReviews';
import Analytics from './pages/Analytics';
import HubLayout from './pages/HubLayout';
import StoreLayout from './pages/StoreLayout';
import StoreDisputes from './pages/StoreDisputes';
import Support from './pages/Support';
import Notifications from './pages/Notifications';
import TeamManagement from './pages/TeamManagement';
import StaffSetup from './pages/StaffSetup';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AcceptInvite from './pages/AcceptInvite';

import AdminOverview from './pages/admin/AdminOverview';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminStores from './pages/admin/AdminStores';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSupport from './pages/admin/AdminSupport';
import SupportAssistant from './components/SupportAssistant';

const DashboardAssistant = () => {
  const { user } = useAuth();
  if (!user) return null;
  return <SupportAssistant />;
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AdminPortalRoute = ({ children }) => {
  const { user } = useAuth();
  return canAccessAdminPortal(user) ? children : <Navigate to={getPostLoginPath(user)} replace />;
};

const MasterAdminRoute = ({ children }) => {
  const { user } = useAuth();
  return isMasterAdmin(user) ? children : <Navigate to={getPostLoginPath(user)} replace />;
};

const PlatformPermRoute = ({ perm, children }) => {
  const { user } = useAuth();
  if (isMasterAdmin(user)) return children;
  const required = Array.isArray(perm) ? perm : [perm];
  if (isPlatformStaff(user) && required.some((p) => hasPerm(user, p))) return children;
  return <Navigate to={getPostLoginPath(user)} replace />;
};

const OwnerRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'owner' ? children : <Navigate to={getPostLoginPath(user)} replace />;
};

const AuthRoute = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    if (!user || routing) return;
    setRouting(true);
    navigateAfterAuth(user, navigate);
  }, [user, navigate, routing]);

  if (user) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center text-cyan-400 animate-pulse">
        Redirecting…
      </div>
    );
  }
  return <AuthPage />;
};

const PublicHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigateAfterAuth(user, navigate);
  }, [user, navigate]);

  if (user) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center text-cyan-400 animate-pulse">
        Redirecting…
      </div>
    );
  }
  return <LandingPage />;
};

const HubFallback = () => {
  const { user } = useAuth();
  const path = getPostLoginPath(user);
  const nested = path.replace(/^\/hub\//, '');
  return <Navigate to={nested || 'stores'} replace />;
};

const WorkspaceGuard = ({ children }) => {
  const { user, activeStore } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    const presenceWorkspace = activeStore && isPresenceType(activeStore.storeType);

    // Portfolio / blog workspaces: commerce-only surfaces are hidden (Reviews stays available)
    if (
      presenceWorkspace &&
      (path.includes('/analytics') || path.includes('/disputes'))
    ) {
      toast.info('That section is for commerce stores. Opening Widgets.');
      navigate('/workspace/widgets', { replace: true });
      return;
    }

    if (user.role !== 'staff') return;
    if (isPlatformStaff(user) && isSupportOnly(user)) {
      toast.error('Access Denied: Insufficient Permissions');
      navigate(getPostLoginPath(user), { replace: true });
      return;
    }

    let denied = false;

    if (
      (path.includes('/integration') ||
        path.includes('/widgets') ||
        path.includes('/design-lab') ||
        path.includes('/google-reviews')) &&
      !hasPerm(user, 'integrations') &&
      !hasPerm(user, 'settings')
    ) {
      denied = true;
    }
    if (path.includes('/reviews') && !hasPerm(user, 'moderation') && !hasPerm(user, 'products')) denied = true;
    if (path.includes('/disputes') && !hasPerm(user, 'moderation') && !hasPerm(user, 'disputes')) denied = true;
    if (
      path.includes('/analytics') &&
      !(
        hasPerm(user, 'moderation') ||
        hasPerm(user, 'products') ||
        hasPerm(user, 'integrations') ||
        hasPerm(user, 'settings') ||
        hasPerm(user, 'disputes') ||
        hasPerm(user, 'stores_read') ||
        hasPerm(user, 'analytics_platform')
      )
    ) {
      denied = true;
    }
    if (isStoreSupportOnly(user)) denied = true;

    if (denied) {
      toast.error('Access Denied: Insufficient Permissions');
      navigate(getWorkspaceFallbackPath(user), { replace: true });
    }
  }, [user, location.pathname, navigate, activeStore]);

  return children;
};

const isStoreSupportOnly = (user) =>
  user?.role === 'staff' && !isPlatformStaff(user) && isSupportOnly(user);

const WorkspaceFallback = () => {
  const { activeStore } = useAuth();
  if (activeStore && isPresenceType(activeStore.storeType)) {
    return <Navigate to="/workspace/widgets" replace />;
  }
  return <Navigate to="/workspace/analytics/overview" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<AuthRoute />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/staff-setup" element={<StaffSetup />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          <Route
            path="/hub/*"
            element={
              <ProtectedRoute>
                <HubLayout>
                  <Routes>
                    <Route path="stores" element={<StoresHub />} />
                    <Route path="presence" element={<PresenceOverview />} />
                    <Route path="onboarding/store" element={<OwnerRoute><StoreOnboarding /></OwnerRoute>} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="support" element={<Support />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="team" element={<OwnerRoute><TeamManagement variant="store" /></OwnerRoute>} />

                    <Route path="admin/overview" element={<AdminPortalRoute><PlatformPermRoute perm={['analytics_platform', 'stores_read']}><AdminOverview /></PlatformPermRoute></AdminPortalRoute>} />
                    <Route path="admin/disputes" element={<AdminPortalRoute><PlatformPermRoute perm="disputes_resolve"><AdminDisputes /></PlatformPermRoute></AdminPortalRoute>} />
                    <Route path="admin/stores" element={<AdminPortalRoute><PlatformPermRoute perm={['stores_read', 'moderation']}><AdminStores /></PlatformPermRoute></AdminPortalRoute>} />
                    <Route path="admin/users" element={<AdminPortalRoute><PlatformPermRoute perm="users_read"><AdminUsers /></PlatformPermRoute></AdminPortalRoute>} />
                    <Route path="admin/support" element={<AdminPortalRoute><PlatformPermRoute perm="support_queue"><AdminSupport /></PlatformPermRoute></AdminPortalRoute>} />
                    <Route path="admin/team" element={<MasterAdminRoute><TeamManagement variant="platform" /></MasterAdminRoute>} />

                    <Route path="*" element={<HubFallback />} />
                  </Routes>
                </HubLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace/*"
            element={
              <ProtectedRoute>
                <WorkspaceGuard>
                  <StoreLayout>
                    <Routes>
                      <Route path="reviews" element={<Reviews />} />
                      <Route path="disputes" element={<StoreDisputes />} />
                      <Route path="analytics/*" element={<Analytics />} />
                      <Route path="integration" element={<Integration />} />
                      <Route path="widgets" element={<WidgetCatalog />} />
                      <Route path="design-lab" element={<DesignLab />} />
                      <Route path="google-reviews" element={<GoogleReviews />} />
                      <Route path="*" element={<WorkspaceFallback />} />
                    </Routes>
                  </StoreLayout>
                </WorkspaceGuard>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DashboardAssistant />
      </Router>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </AuthProvider>
  );
}
