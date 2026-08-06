import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, X, UserIcon, Activity, AlertOctagon, StoreIcon, Users, LogOut, LifeBuoy, LayoutDashboard, Globe2, Bell } from "lucide-react";
import logo from '../assets/logo.png';
import api from '../Api';
import {
  hasPerm,
  isSupportOnly,
  isMasterAdmin,
  isPlatformStaff,
  canAccessAdminPortal,
  resolveHubNavMode,
  peekWorkspaceMode,
} from '../utils/permissionHelpers';
import { getAdminQueueSeen, markAdminQueueSeen } from '../utils/adminBadges';

/** tone: danger (disputes) | warn (support) | info */
const Badge = ({ count, tone = 'info' }) => {
  if (!count || count < 1) return null;
  const styles = {
    danger: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
    warn: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    info: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
  };
  return (
    <span className={`ml-auto text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center ${styles[tone] || styles.info}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

const HubLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [badges, setBadges] = useState({ openTickets: 0, openDisputes: 0, unreadNotifications: 0 });
  const [workspaceMode, setWorkspaceMode] = useState(() => peekWorkspaceMode() || 'empty'); // commerce | presence | empty
  const location = useLocation();
  const closeMenu = () => setIsMobileMenuOpen(false);

  const showAdminNav = canAccessAdminPortal(user);
  const master = isMasterAdmin(user);
  const platform = isPlatformStaff(user);
  const showPresenceNav = !showAdminNav && workspaceMode === 'presence';
  const showCommerceNav = !showAdminNav && !showPresenceNav;

  useEffect(() => {
    if (showAdminNav || !user) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/store/mystores');
        if (!alive) return;
        setWorkspaceMode(resolveHubNavMode(res.data.data || [], location.pathname));
      } catch {
        if (alive) setWorkspaceMode(resolveHubNavMode([], location.pathname));
      }
    })();
    return () => { alive = false; };
  }, [user?._id, showAdminNav, location.pathname]);

  // Opening a queue marks it read so the badge clears until newer items arrive
  useEffect(() => {
    if (!showAdminNav) return;
    if (location.pathname.includes('/admin/disputes')) markAdminQueueSeen('disputes');
    if (location.pathname.includes('/admin/support')) markAdminQueueSeen('tickets');
  }, [showAdminNav, location.pathname]);

  useEffect(() => {
    let alive = true;
    const loadBadges = async () => {
      try {
        if (showAdminNav) {
          const params = {};
          const disputesSince = getAdminQueueSeen('disputes');
          const ticketsSince = getAdminQueueSeen('tickets');
          if (disputesSince) params.disputesSince = disputesSince;
          if (ticketsSince) params.ticketsSince = ticketsSince;
          const res = await api.get('/admin/nav-badges', { params });
          if (alive) setBadges(res.data?.data || { openTickets: 0, openDisputes: 0, unreadNotifications: 0 });
        } else if (user?.role === 'owner' || (user?.role === 'staff' && hasPerm(user, 'tickets'))) {
          const res = await api.get('/users/nav-badges');
          if (alive) setBadges(res.data?.data || { openTickets: 0, openDisputes: 0, unreadNotifications: 0 });
        } else if (user) {
          try {
            const res = await api.get('/users/notifications', { params: { unread: 1 } });
            if (alive) setBadges((b) => ({ ...b, unreadNotifications: res.data?.unread || 0 }));
          } catch { /* ignore */ }
        }
      } catch {
        /* silent — badges are non-critical */
      }
    };
    loadBadges();
    const id = setInterval(loadBadges, 60000);
    const onRefresh = () => loadBadges();
    window.addEventListener('echo:refresh-admin-badges', onRefresh);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener('echo:refresh-admin-badges', onRefresh);
    };
  }, [user?._id, user?.role, showAdminNav]);

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0A0F1A] z-40 relative">
        <div className="flex items-center gap-2">
          <img src={logo} alt="EchoStream Logo" className="h-6 w-auto object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          <h2 className="text-xl font-black tracking-tighter">Echo Hub</h2>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={closeMenu} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0A0F1A] flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:bg-black/20 md:backdrop-blur-3xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="p-8 pb-4">
            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3 mb-8 hidden md:flex">
              <img src={logo} alt="EchoStream Logo" className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" />
              EchoStream
            </h2>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl w-full">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="Profile" className="w-12 h-12 rounded-full object-cover border border-cyan-500/50" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                  <UserIcon className="text-cyan-400" size={24} />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">Hello, {user?.userName}</p>
                <p className={`text-xs capitalize ${master || platform ? 'text-red-400' : 'text-cyan-400'}`}>
                  {platform ? 'platform staff' : user?.role}
                </p>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-2 mt-4">
            {showAdminNav ? (
              <>
                {(master || hasPerm(user, 'analytics_platform') || hasPerm(user, 'stores_read')) && (
                  <Link to="/hub/admin/overview" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/overview') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <Activity size={20} className={location.pathname.includes('/overview') ? "text-red-400" : ""} /> Overview & Summary
                  </Link>
                )}
                {(master || hasPerm(user, 'disputes_resolve')) && (
                  <Link to="/hub/admin/disputes" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/disputes') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <AlertOctagon size={20} className={location.pathname.includes('/disputes') ? "text-red-400" : ""} /> Dispute Queue
                    <Badge count={badges.openDisputes} tone="danger" />
                  </Link>
                )}
                {(master || hasPerm(user, 'stores_read') || hasPerm(user, 'moderation')) && (
                  <Link to="/hub/admin/stores" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/admin/stores') || (location.pathname.includes('/stores') && location.pathname.includes('/admin')) ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <StoreIcon size={20} /> Platform Stores
                  </Link>
                )}
                {(master || hasPerm(user, 'users_read')) && (
                  <Link to="/hub/admin/users" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/users') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <Users size={20} /> Registered Users
                  </Link>
                )}
                {(master || hasPerm(user, 'support_queue')) && (
                  <Link to="/hub/admin/support" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/admin/support') || (location.pathname.includes('/support') && location.pathname.includes('/admin')) ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <LifeBuoy size={20} /> Support Queue
                    <Badge count={badges.openTickets} tone="warn" />
                  </Link>
                )}
                {master && (
                  <Link to="/hub/admin/team" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/admin/team') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <Users size={20} className={location.pathname.includes('/admin/team') ? "text-red-400" : ""} /> Platform Team
                  </Link>
                )}
              </>
            ) : showPresenceNav ? (
              <>
                <Link to="/hub/presence" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/presence') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <LayoutDashboard size={20} className={location.pathname.includes('/hub/presence') ? 'text-emerald-400' : ''} /> Presence Home
                </Link>
                {user?.role === 'owner' && (
                  <Link to="/hub/team" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/team') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <Users size={20} className={location.pathname.includes('/hub/team') ? 'text-cyan-400' : ''} /> Team
                  </Link>
                )}
                {hasPerm(user, 'tickets') && (
                  <Link to="/hub/support" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/support') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <LifeBuoy size={20} className={location.pathname.includes('/hub/support') ? 'text-cyan-400' : ''} /> Help & Support
                    <Badge count={badges.openTickets} tone="warn" />
                  </Link>
                )}
                <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Globe2 size={12} /> Portfolio / Blog mode
                </div>
              </>
            ) : showCommerceNav ? (
              <>
                {!isSupportOnly(user) && (
                  <Link to="/hub/stores" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/stores') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <StoreIcon size={20} className={location.pathname.includes('/hub/stores') ? "text-cyan-400" : ""} /> My Stores
                  </Link>
                )}
                {user?.role === 'owner' && (
                  <Link to="/hub/team" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/team') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <Users size={20} className={location.pathname.includes('/hub/team') ? "text-cyan-400" : ""} /> Team
                  </Link>
                )}
                {hasPerm(user, 'tickets') && (
                  <Link to="/hub/support" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/support') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <LifeBuoy size={20} className={location.pathname.includes('/hub/support') ? "text-cyan-400" : ""} /> Help & Support
                    <Badge count={badges.openTickets} tone="warn" />
                  </Link>
                )}
              </>
            ) : null}

            {!showAdminNav && (
              <Link to="/hub/notifications" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/notifications') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Bell size={20} className={location.pathname.includes('/notifications') ? 'text-cyan-400' : ''} /> Notifications
                <Badge count={badges.unreadNotifications} tone="info" />
              </Link>
            )}

            <Link to="/hub/profile" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/profile') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <UserIcon size={20} className={location.pathname.includes('/profile') ? "text-purple-400" : ""} /> Profile Settings
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-bold">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-0 h-[calc(100vh-65px)] md:h-screen">
        {children}
      </main>
    </div>
  );
};

export default HubLayout;
