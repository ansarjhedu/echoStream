import { useAuth } from "../context/AuthContext";
import { useLocation, Link, Navigate } from "react-router-dom";
import { BarChart3, Package, ArrowLeft, User, LayoutTemplate, Palette, Globe2, MessageSquare, Mail } from "lucide-react";
import logo from '../assets/logo-wordmark.jpg';
import { hasPerm, isSupportOnly, getPostLoginPath, canAccessAdminPortal, canManageWidgets, isPresenceType } from '../utils/permissionHelpers';
import MobileDock from '../components/MobileDock';
import MobileHeader from '../components/MobileHeader';
import { packDock } from '../utils/packDock';

const StoreLayout = ({ children }) => {
  const { activeStore, setActiveStore, user, logout } = useAuth();
  const location = useLocation();

  const isPresence = isPresenceType(activeStore?.storeType);
  const isAnalyticsActive = location.pathname.includes('/analytics');
  const showAnalytics = !isPresence && !isSupportOnly(user);
  const showModeration = !isPresence && hasPerm(user, 'moderation');
  const showPresenceReviews = isPresence && (hasPerm(user, 'moderation') || hasPerm(user, 'products') || user?.role === 'owner');
  const showWidgets = canManageWidgets(user);
  const showCampaigns = !isPresence && (user?.role === 'owner' || user?.role === 'admin' || hasPerm(user, 'campaigns'));
  const isWidgetsActive = location.pathname.includes('/widgets');
  const isDesignLabActive = location.pathname.includes('/design-lab') || location.pathname.includes('/integration');
  const isReviewsActive = location.pathname.includes('/reviews');
  const isCampaignsActive = location.pathname.includes('/campaigns');

  if (!activeStore) return <Navigate to={getPostLoginPath(user)} replace />;

  const hubItem = canAccessAdminPortal(user)
    ? { key: 'admin', to: getPostLoginPath(user), label: 'Admin', icon: User }
    : {
        key: 'hub',
        to: isPresence ? '/hub/presence' : getPostLoginPath(user),
        label: 'Hub',
        icon: ArrowLeft,
        onClick: () => setActiveStore(null),
      };

  const mobileDock = packDock(
    [
      showAnalytics && { key: 'analytics', to: '/workspace/analytics/overview', label: 'Analytics', icon: BarChart3, active: isAnalyticsActive },
      showModeration && { key: 'products', to: '/workspace/reviews', label: 'Products', icon: Package, active: isReviewsActive },
      showPresenceReviews && { key: 'reviews', to: '/workspace/reviews', label: 'Reviews', icon: MessageSquare, active: isReviewsActive },
      showCampaigns && { key: 'campaigns', to: '/workspace/campaigns/request', label: 'Campaigns', icon: Mail, active: isCampaignsActive },
      showWidgets && { key: 'widgets', to: '/workspace/widgets', label: 'Widgets', icon: LayoutTemplate, active: isWidgetsActive },
      showWidgets && { key: 'google', to: '/workspace/google-reviews', label: 'Google', icon: Globe2, active: location.pathname.includes('/google-reviews') },
      hubItem,
    ],
    {
      center: showWidgets
        ? { key: 'design', to: '/workspace/design-lab', label: 'Design', icon: Palette, active: isDesignLabActive }
        : null,
      extras: [
        showAnalytics && { key: 'performance', to: '/workspace/analytics/products', label: 'Product performance', icon: BarChart3, active: location.pathname.includes('/analytics/products') },
        showCampaigns && { key: 'launch', to: '/workspace/campaigns/launch', label: 'Launch campaign', icon: Mail, active: location.pathname.includes('/campaigns/launch') },
      ],
      account: {
        key: 'account',
        to: '/hub/profile',
        user,
        onClick: () => setActiveStore(null),
      },
    }
  );

  return (
    <div className="echo-shell h-dvh bg-[#0A0F1A] text-white flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 overflow-hidden">
      <MobileHeader
        store={activeStore}
        homeTo={isPresence ? '/hub/presence' : '/hub/stores'}
        onLogout={logout}
        onLeave={() => setActiveStore(null)}
      />

      <aside className="hidden md:flex md:h-screen md:flex-col md:w-72 md:shrink-0 md:justify-between md:overflow-y-auto border-r border-white/10 bg-black/20 backdrop-blur-3xl">
        <div>
          <div className="p-8 hidden md:block">
            <h2 className="mb-6">
              <img src={logo} alt="EchoStream" className="h-10 w-auto max-w-[220px] object-contain object-left" />
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{isPresence ? 'Site' : 'Workspace'}</p>
              <p className="text-cyan-400 font-bold truncate">{activeStore.storeName}</p>
              {isPresence && (
                <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 mt-1 capitalize">
                  {activeStore.storeType}
                </p>
              )}
            </div>
          </div>

          <nav className="px-4 space-y-2 mt-4">
            {showAnalytics && (
              <div className="space-y-1">
                <Link
                  to="/workspace/analytics/overview"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${isAnalyticsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 size={20} className={isAnalyticsActive ? "text-cyan-400" : ""} />
                    Analytics
                  </div>
                </Link>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAnalyticsActive ? 'max-h-40 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                  <div className="flex flex-col gap-1 pr-2">
                    <Link to="/workspace/analytics/overview" className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/analytics/overview') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}>
                      Overview
                    </Link>
                    <Link to="/workspace/analytics/products" className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/analytics/products') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}>
                      Product performance
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {showModeration && (
              <Link to="/workspace/reviews" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isReviewsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Package size={20} className={isReviewsActive ? "text-cyan-400" : ""} /> Products
              </Link>
            )}
            {showPresenceReviews && (
              <Link to="/workspace/reviews" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isReviewsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <MessageSquare size={20} className={isReviewsActive ? "text-cyan-400" : ""} /> Reviews
              </Link>
            )}
            {showCampaigns && (
              <div className="space-y-1">
                <Link
                  to="/workspace/campaigns/request"
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${isCampaignsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <Mail size={20} className={isCampaignsActive ? 'text-cyan-400' : ''} />
                    Email Campaigns
                  </div>
                </Link>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCampaignsActive ? 'max-h-40 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                  <div className="flex flex-col gap-1 pr-2">
                    <Link
                      to="/workspace/campaigns/request"
                      className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/campaigns/request') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                    >
                      Request a review
                    </Link>
                    <Link
                      to="/workspace/campaigns/launch"
                      className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/campaigns/launch') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                    >
                      Launch campaign
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {showWidgets && (
              <Link to="/workspace/widgets" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isWidgetsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <LayoutTemplate size={20} className={isWidgetsActive ? "text-cyan-400" : ""} /> Widgets
              </Link>
            )}
            {showWidgets && (
              <Link to="/workspace/design-lab" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isDesignLabActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Palette size={20} className={isDesignLabActive ? "text-purple-400" : ""} /> Design Lab
              </Link>
            )}
            {showWidgets && (
              <Link to="/workspace/google-reviews" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/google-reviews') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Globe2 size={20} className={location.pathname.includes('/google-reviews') ? "text-emerald-400" : ""} /> Google Reviews
              </Link>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          {canAccessAdminPortal(user) ? (
            <Link to={getPostLoginPath(user)} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold">
              <User size={18} /> Admin Hub
            </Link>
          ) : (
            <Link
              to={isPresence ? '/hub/presence' : getPostLoginPath(user)}
              onClick={() => setActiveStore(null)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold"
            >
              <ArrowLeft size={18} /> Back to Hub
            </Link>
          )}
        </div>
      </aside>

      <main className="echo-shell-main flex-1 overflow-y-auto relative z-0 custom-scrollbar">
        {children}
      </main>

      <MobileDock {...mobileDock} />
    </div>
  );
};

export default StoreLayout;
