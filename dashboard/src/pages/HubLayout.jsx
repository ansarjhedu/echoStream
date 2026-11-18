import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { UserIcon, Activity, StoreIcon, Users, LogOut, LifeBuoy, LayoutDashboard, Globe2, Bell, CreditCard } from "lucide-react";
import logo from '../assets/logo-wordmark.png';
import mark from '../assets/logo-mark.png';
import api from '../Api';
import MobileDock from '../components/MobileDock';
import MobileHeader from '../components/MobileHeader';
import { packDock } from '../utils/packDock';
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

/** tone: warn (support) | info */
const Badge = ({ count, tone = 'info' }) => {
  if (!count || count < 1) return null;
  const styles = {
    warn: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    info: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
  };
  return (
    <span className={`echo-side-badge ml-auto text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center ${styles[tone] || styles.info}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

const HubLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [badges, setBadges] = useState({ openTickets: 0, unreadNotifications: 0 });
  const [workspaceMode, setWorkspaceMode] = useState(() => peekWorkspaceMode() || 'empty'); // commerce | presence | empty
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('echo-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try { localStorage.setItem('echo-sidebar-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

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

  useEffect(() => {
    if (!showAdminNav) return;
    if (location.pathname.includes('/admin/support')) markAdminQueueSeen();
  }, [showAdminNav, location.pathname]);

  useEffect(() => {
    let alive = true;
    const loadBadges = async () => {
      try {
        if (showAdminNav) {
          const params = {};
          const ticketsSince = getAdminQueueSeen('tickets');
          if (ticketsSince) params.ticketsSince = ticketsSince;
          const res = await api.get('/admin/nav-badges', { params });
          if (alive) setBadges(res.data?.data || { openTickets: 0, unreadNotifications: 0 });
        } else if (user?.role === 'owner' || (user?.role === 'staff' && hasPerm(user, 'tickets'))) {
          const res = await api.get('/users/nav-badges');
          if (alive) setBadges(res.data?.data || { openTickets: 0, unreadNotifications: 0 });
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

  const billingItem = user?.role === 'owner'
    ? { key: 'billing', to: '/hub/billing', label: 'Billing', icon: CreditCard, active: location.pathname.includes('/billing') }
    : null;
  const account = {
    key: 'account',
    to: '/hub/profile',
    user,
    active: location.pathname.includes('/profile'),
  };

  const mobileDock = showAdminNav
    ? packDock(
      [
        (master || hasPerm(user, 'analytics_platform') || hasPerm(user, 'stores_read')) && {
          key: 'overview', to: '/hub/admin/overview', label: 'Overview', icon: Activity, active: location.pathname.includes('/overview'),
        },
        (master || hasPerm(user, 'stores_read') || hasPerm(user, 'moderation')) && {
          key: 'stores', to: '/hub/admin/stores', label: 'Stores', icon: StoreIcon,
          active: location.pathname.includes('/admin/stores'),
        },
        (master || hasPerm(user, 'support_queue')) && {
          key: 'queue', to: '/hub/admin/support', label: 'Support', icon: LifeBuoy, badge: badges.openTickets,
          active: location.pathname.includes('/admin/support'),
        },
        (master || hasPerm(user, 'users_read')) && {
          key: 'users', to: '/hub/admin/users', label: 'Users', icon: Users, active: location.pathname.includes('/admin/users'),
        },
      ],
      {
        centerIsMore: true,
        extras: [
          (master || hasPerm(user, 'users_read') || hasPerm(user, 'analytics_platform')) && {
            key: 'subs', to: '/hub/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, active: location.pathname.includes('/subscriptions'),
          },
          master && { key: 'team', to: '/hub/admin/team', label: 'Platform team', icon: Users, active: location.pathname.includes('/admin/team') },
        ],
        account,
      }
    )
    : packDock(
      [
        showPresenceNav && {
          key: 'home', to: '/hub/presence', label: 'Home', icon: LayoutDashboard, active: location.pathname.includes('/hub/presence'),
        },
        showCommerceNav && !isSupportOnly(user) && {
          key: 'stores', to: '/hub/stores', label: 'Stores', icon: StoreIcon, active: location.pathname.includes('/hub/stores'),
        },
        user?.role === 'owner' && {
          key: 'team', to: '/hub/team', label: 'Team', icon: Users, active: location.pathname.includes('/hub/team'),
        },
        hasPerm(user, 'tickets') && {
          key: 'help', to: '/hub/support', label: 'Help', icon: LifeBuoy, badge: badges.openTickets,
          active: location.pathname.includes('/hub/support'),
        },
      ],
      { centerIsMore: true, extras: [billingItem], account }
    );

  return (
    <div className="echo-shell h-dvh bg-[#0A0F1A] text-white flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 overflow-hidden">
      <MobileHeader
        alertCount={showAdminNav ? undefined : badges.unreadNotifications}
        onLogout={logout}
      />

      <aside
        data-collapsed={collapsed ? 'true' : 'false'}
        className={`echo-sidebar hidden md:flex md:h-screen md:flex-col md:shrink-0 md:overflow-hidden border-r border-white/10 bg-black/20 backdrop-blur-3xl ${collapsed ? 'md:w-[4.5rem]' : 'md:w-72'}`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="echo-side-pad px-4 pt-5 pb-4">
            <div className="echo-side-brand mb-4">
              <h2 className="echo-side-word min-w-0">
                <img src={logo} alt="EchoStream" className="w-full h-auto" />
              </h2>
              <img src={mark} alt="" className="echo-side-mark w-10 h-auto mx-auto" />
            </div>
            <div className="echo-side-profile flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl w-full">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="Profile" className="w-12 h-12 rounded-full object-cover border border-cyan-500/50" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                  <UserIcon className="text-cyan-400" size={24} />
                </div>
              )}
              <div className="echo-side-extra overflow-hidden">
                <p className="text-sm font-bold text-white truncate">Hello, {user?.userName}</p>
                <p className={`text-xs capitalize ${master || platform ? 'text-red-400' : 'text-cyan-400'}`}>
                  {platform ? 'platform staff' : user?.role}
                </p>
              </div>
            </div>
          </div>

          <nav className="echo-side-pad px-3 space-y-2 mt-4">
            {showAdminNav ? (
              <>
                {(master || hasPerm(user, 'analytics_platform') || hasPerm(user, 'stores_read')) && (
                  <Link to="/hub/admin/overview" title="Overview & Summary" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/overview') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <Activity size={20} className={`shrink-0 ${location.pathname.includes('/overview') ? "text-red-400" : ""}`} />
                    <span className="echo-side-label truncate">Overview & Summary</span>
                  </Link>
                )}
                {(master || hasPerm(user, 'stores_read') || hasPerm(user, 'moderation')) && (
                  <Link to="/hub/admin/stores" title="Platform Stores" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/admin/stores') || (location.pathname.includes('/stores') && location.pathname.includes('/admin')) ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <StoreIcon size={20} className="shrink-0" />
                    <span className="echo-side-label truncate">Platform Stores</span>
                  </Link>
                )}
                {(master || hasPerm(user, 'users_read') || hasPerm(user, 'analytics_platform')) && (
                  <Link to="/hub/admin/subscriptions" title="Subscriptions" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/subscriptions') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <CreditCard size={20} className={`shrink-0 ${location.pathname.includes('/subscriptions') ? "text-red-400" : ""}`} />
                    <span className="echo-side-label truncate">Subscriptions</span>
                  </Link>
                )}
                {(master || hasPerm(user, 'users_read')) && (
                  <Link to="/hub/admin/users" title="Registered Users" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/users') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <Users size={20} className="shrink-0" />
                    <span className="echo-side-label truncate">Registered Users</span>
                  </Link>
                )}
                {(master || hasPerm(user, 'support_queue')) && (
                  <Link to="/hub/admin/support" title="Support Queue" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/admin/support') || (location.pathname.includes('/support') && location.pathname.includes('/admin')) ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <LifeBuoy size={20} className="shrink-0" />
                    <span className="echo-side-label truncate">Support Queue</span>
                    <Badge count={badges.openTickets} tone="warn" />
                  </Link>
                )}
                {master && (
                  <Link to="/hub/admin/team" title="Platform Team" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/admin/team') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                    <Users size={20} className={`shrink-0 ${location.pathname.includes('/admin/team') ? "text-red-400" : ""}`} />
                    <span className="echo-side-label truncate">Platform Team</span>
                  </Link>
                )}
              </>
            ) : showPresenceNav ? (
              <>
                <Link to="/hub/presence" title="Presence Home" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/presence') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <LayoutDashboard size={20} className={`shrink-0 ${location.pathname.includes('/hub/presence') ? 'text-emerald-400' : ''}`} />
                  <span className="echo-side-label truncate">Presence Home</span>
                </Link>
                {user?.role === 'owner' && (
                  <Link to="/hub/team" title="Team" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/team') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <Users size={20} className={`shrink-0 ${location.pathname.includes('/hub/team') ? 'text-cyan-400' : ''}`} />
                    <span className="echo-side-label truncate">Team</span>
                  </Link>
                )}
                {hasPerm(user, 'tickets') && (
                  <Link to="/hub/support" title="Help & Support" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/support') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <LifeBuoy size={20} className={`shrink-0 ${location.pathname.includes('/hub/support') ? 'text-cyan-400' : ''}`} />
                    <span className="echo-side-label truncate">Help & Support</span>
                    <Badge count={badges.openTickets} tone="warn" />
                  </Link>
                )}
                <div className="echo-side-extra px-4 py-2 text-[10px] uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Globe2 size={12} /> Portfolio / Blog mode
                </div>
              </>
            ) : showCommerceNav ? (
              <>
                {!isSupportOnly(user) && (
                  <Link to="/hub/stores" title="My Stores" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/stores') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <StoreIcon size={20} className={`shrink-0 ${location.pathname.includes('/hub/stores') ? "text-cyan-400" : ""}`} />
                    <span className="echo-side-label truncate">My Stores</span>
                  </Link>
                )}
                {user?.role === 'owner' && (
                  <Link to="/hub/team" title="Team" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/team') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <Users size={20} className={`shrink-0 ${location.pathname.includes('/hub/team') ? 'text-cyan-400' : ''}`} />
                    <span className="echo-side-label truncate">Team</span>
                  </Link>
                )}
                {hasPerm(user, 'tickets') && (
                  <Link to="/hub/support" title="Help & Support" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/support') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <LifeBuoy size={20} className={`shrink-0 ${location.pathname.includes('/hub/support') ? "text-cyan-400" : ""}`} />
                    <span className="echo-side-label truncate">Help & Support</span>
                    <Badge count={badges.openTickets} tone="warn" />
                  </Link>
                )}
              </>
            ) : null}

            {!showAdminNav && (
              <Link to="/hub/notifications" title="Notifications" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/notifications') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Bell size={20} className={`shrink-0 ${location.pathname.includes('/notifications') ? 'text-cyan-400' : ''}`} />
                <span className="echo-side-label truncate">Notifications</span>
                <Badge count={badges.unreadNotifications} tone="info" />
              </Link>
            )}

            <Link to="/hub/profile" title="Profile Settings" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/profile') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <UserIcon size={20} className={`shrink-0 ${location.pathname.includes('/profile') ? "text-purple-400" : ""}`} />
              <span className="echo-side-label truncate">Profile Settings</span>
            </Link>
            {user?.role === 'owner' && (
              <Link to="/hub/billing" title="Billing" className={`echo-side-link relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/billing') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <CreditCard size={20} className={`shrink-0 ${location.pathname.includes('/billing') ? 'text-cyan-400' : ''}`} />
                <span className="echo-side-label truncate">Billing</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="shrink-0 px-3 pt-3 pb-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="echo-collapse"
          >
            <span className="echo-collapse-icon" aria-hidden>
              <span className="echo-collapse-rail" />
              <span className="echo-collapse-chevron" />
            </span>
          </button>
          <button onClick={logout} title="Logout" className="echo-side-link relative w-full flex items-center justify-start gap-2 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-bold">
            <LogOut size={18} className="shrink-0 -scale-x-100" />
            <span className="echo-side-label">Logout</span>
          </button>
        </div>
      </aside>

      <main className="echo-shell-main flex-1 min-w-0 overflow-y-auto relative">
        {children}
      </main>

      <MobileDock {...mobileDock} />
    </div>
  );
};

export default HubLayout;
