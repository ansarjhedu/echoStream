import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { X, Menu, BarChart3, Package, ArrowLeft, User, AlertOctagon, LayoutTemplate, Palette, Globe2, MessageSquare } from "lucide-react";
import logo from '../assets/logo.png';
import api from '../Api';
import { hasPerm, isSupportOnly, getPostLoginPath, canAccessAdminPortal, canManageWidgets, isPresenceType } from '../utils/permissionHelpers';

const NavBadge = ({ count }) => {
  if (!count || count < 1) return null;
  return (
    <span className="ml-auto text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center bg-orange-500/20 text-orange-300 border border-orange-500/40">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const StoreLayout = ({ children }) => {
  const { activeStore, setActiveStore, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingDisputes, setPendingDisputes] = useState(0);
  const location = useLocation();
  const closeMenu = () => setIsMobileMenuOpen(false);

  const isPresence = isPresenceType(activeStore?.storeType);
  const isAnalyticsActive = location.pathname.includes('/analytics');
  const showAnalytics = !isPresence && !isSupportOnly(user);
  const showModeration = !isPresence && hasPerm(user, 'moderation');
  const showPresenceReviews = isPresence && (hasPerm(user, 'moderation') || hasPerm(user, 'products') || user?.role === 'owner');
  const showDisputes = !isPresence && (hasPerm(user, 'moderation') || hasPerm(user, 'disputes'));
  const showWidgets = canManageWidgets(user);
  const isWidgetsActive = location.pathname.includes('/widgets');
  const isDesignLabActive = location.pathname.includes('/design-lab') || location.pathname.includes('/integration');
  const isReviewsActive = location.pathname.includes('/reviews');

  useEffect(() => {
    if (!activeStore?._id || !showDisputes) {
      setPendingDisputes(0);
      return;
    }
    let alive = true;
    const loadBadge = async () => {
      try {
        const res = await api.get(`/store/${activeStore._id}/disputes`, { params: { filter: 'pending' } });
        if (alive) setPendingDisputes(res.data?.summary?.pending || 0);
      } catch {
        if (alive) setPendingDisputes(0);
      }
    };
    loadBadge();
    const id = setInterval(loadBadge, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [activeStore?._id, showDisputes, location.pathname]);

  if (!activeStore) return <Navigate to={getPostLoginPath(user)} replace />;

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0A0F1A] z-40 relative">
        <div className="flex items-center gap-2">
          <img src={logo} alt="EchoStream Logo" className="h-6 w-auto object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          <h2 className="text-xl font-black tracking-tighter truncate max-w-[150px]">{activeStore.storeName}</h2>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={closeMenu} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0A0F1A] flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:bg-black/20 md:backdrop-blur-3xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="p-8 hidden md:block">
            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3 mb-6">
              <img src={logo} alt="EchoStream Logo" className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" />
              EchoStream
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
                  onClick={closeMenu}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${isAnalyticsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 size={20} className={isAnalyticsActive ? "text-cyan-400" : ""} />
                    Analytics
                  </div>
                </Link>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAnalyticsActive ? 'max-h-40 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                  <div className="flex flex-col gap-1 pr-2">
                    <Link to="/workspace/analytics/overview" onClick={closeMenu} className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/analytics/overview') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}>
                      Overview
                    </Link>
                    <Link to="/workspace/analytics/products" onClick={closeMenu} className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/analytics/products') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}>
                      Products
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {showModeration && (
              <Link to="/workspace/reviews" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isReviewsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Package size={20} className={isReviewsActive ? "text-cyan-400" : ""} /> Moderation
              </Link>
            )}
            {showPresenceReviews && (
              <Link to="/workspace/reviews" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isReviewsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <MessageSquare size={20} className={isReviewsActive ? "text-cyan-400" : ""} /> Reviews
              </Link>
            )}
            {showDisputes && (
              <Link to="/workspace/disputes" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/disputes') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <AlertOctagon size={20} className={location.pathname.includes('/disputes') ? "text-orange-400" : ""} /> Disputes
                <NavBadge count={pendingDisputes} />
              </Link>
            )}
            {showWidgets && (
              <Link to="/workspace/widgets" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isWidgetsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <LayoutTemplate size={20} className={isWidgetsActive ? "text-cyan-400" : ""} /> Widgets
              </Link>
            )}
            {showWidgets && (
              <Link to="/workspace/design-lab" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isDesignLabActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Palette size={20} className={isDesignLabActive ? "text-purple-400" : ""} /> Design Lab
              </Link>
            )}
            {showWidgets && (
              <Link to="/workspace/google-reviews" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/google-reviews') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Globe2 size={20} className={location.pathname.includes('/google-reviews') ? "text-emerald-400" : ""} /> Google Reviews
              </Link>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          {canAccessAdminPortal(user) ? (
            <Link to={getPostLoginPath(user)} onClick={closeMenu} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold">
              <User size={18} /> Admin Hub
            </Link>
          ) : (
            <Link
              to={isPresence ? '/hub/presence' : getPostLoginPath(user)}
              onClick={() => { closeMenu(); setActiveStore(null); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold"
            >
              <ArrowLeft size={18} /> Back to Hub
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-0 h-[calc(100vh-65px)] md:h-screen custom-scrollbar">
        {children}
      </main>
    </div>
  );
};

export default StoreLayout;
