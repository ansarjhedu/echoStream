import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import logo from './assets/image.png'

// Pages
import AuthPage from './pages/AuthPage';
import StoresHub from './pages/StoresHub';
import Profile from './pages/Profile';
import Reviews from './pages/Reviews';
import Integration from './pages/Integration';
import Analytics from './pages/Analytics';

// New Admin Components
import AdminOverview from './pages/admin/AdminOverview';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminStores from './pages/admin/AdminStores';
import AdminUsers from './pages/admin/AdminUsers';

// Icons
import { Code, LogOut, Package, Menu, X, ArrowLeft, User as UserIcon, Store as StoreIcon, BarChart3, AlertOctagon, Activity, Users } from 'lucide-react';

// ---------------------------------------------------------
// 1. THE HUB LAYOUT (Sidebar dynamically switches based on Role!)
// ---------------------------------------------------------
const HubLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0A0F1A] z-40 relative">
        <div className="flex items-center gap-2">
          <img className='w-10' src={logo} alt=""/>
          {/* <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></span> */}
          <h2 className="text-xl font-black tracking-tighter">Echo Hub</h2>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={closeMenu} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0A0F1A] flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:bg-black/20 md:backdrop-blur-3xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="p-8 pb-4">
            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 mb-8 hidden md:flex">
             <img className='w-10' src={logo} alt=""/>
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
               {/* <div className='flex justify-between items-center gap-6'>  */}
                <p className={`text-xs capitalize ${user?.role === 'admin' ? 'text-red-400' : 'text-cyan-400'}`}>{user?.role}</p>
                {/* <span className={`text-xs capitalize ml-2 px-2 py-1 rounded-full ${user?.isActive === true ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {user?.isActive === true ? 'Active' : 'Deleted'}
                </span> */}
               {/* </div> */}
              </div>
            </div>
          </div>
          
          <nav className="px-4 space-y-2 mt-4">
            {/* SUPER ADMIN NAVIGATION */}
            {user?.role === 'admin' ? (
              <>
                <Link to="/hub/admin/overview" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/overview') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                  <Activity size={20} className={location.pathname.includes('/overview') ? "text-red-400" : ""} /> Overview & Summary
                </Link>
                <Link to="/hub/admin/disputes" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/disputes') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                  <AlertOctagon size={20} className={location.pathname.includes('/disputes') ? "text-red-400" : ""} /> Dispute Queue
                </Link>
                <Link to="/hub/admin/stores" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/stores') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                  <StoreIcon size={20} className={location.pathname.includes('/stores') ? "text-red-400" : ""} /> Platform Stores
                </Link>
                <Link to="/hub/admin/users" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/users') ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 text-white' : 'text-gray-400 hover:text-white border-l-4 border-transparent hover:bg-white/5'}`}>
                  <Users size={20} className={location.pathname.includes('/users') ? "text-red-400" : ""} /> Registered Users
                </Link>
              </>
            ) : (
              /* STORE OWNER NAVIGATION */
              <>
                <Link to="/hub/stores" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/hub/stores') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <StoreIcon size={20} className={location.pathname.includes('/hub/stores') ? "text-cyan-400" : ""} /> My Stores
                </Link>
              </>
            )}
            
            {/* SHARED PROFILE TAB */}
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

// ---------------------------------------------------------
// 2. THE STORE WORKSPACE LAYOUT (Same as before)
// ---------------------------------------------------------
const StoreLayout = ({ children }) => {
  const { activeStore, setActiveStore } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setIsMobileMenuOpen(false);

  if (!activeStore) return <Navigate to="/hub/stores" replace />;

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0A0F1A] z-40 relative">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></span>
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
            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 mb-6">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></span>
              EchoStream
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Workspace</p>
              <p className="text-cyan-400 font-bold truncate">{activeStore.storeName}</p>
            </div>
          </div>
          
          <nav className="px-4 space-y-2 mt-4">
            <Link to="/workspace/analytics" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/analytics') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <BarChart3 size={20} className="text-green-400" /> Analytics
            </Link>
            <Link to="/workspace/reviews" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/reviews') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Package size={20} className="text-cyan-400" /> Moderation
            </Link>
            <Link to="/workspace/integration" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/integration') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Code size={20} className="text-purple-400" /> Integration
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link to="/hub/stores" onClick={() => { closeMenu(); setActiveStore(null); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold">
            <ArrowLeft size={18} /> Back to Hub
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-0 h-[calc(100vh-65px)] md:h-screen">
        {children}
      </main>
    </div>
  );
};

// Route Guards
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/hub/stores" replace />;
};

const AuthRoute = () => {
  const { user } = useAuth();
  // The magic fix: Admins land on overview, Owners land on stores!
  if (user) {
    return <Navigate to={user.role === 'admin' ? "/hub/admin/overview" : "/hub/stores"} replace />;
  }
  return <AuthPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthRoute />} />
          
          {/* THE HUB ROUTES */}
          <Route path="/hub/*" element={
            <ProtectedRoute>
              <HubLayout>
                <Routes>
                  <Route path="stores" element={<StoresHub />} />
                  <Route path="profile" element={<Profile />} />
                  
                  {/* ADMIN ROUTES IN THE HUB */}
                  <Route path="admin/overview" element={<AdminRoute><AdminOverview /></AdminRoute>} />
                  <Route path="admin/disputes" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
                  <Route path="admin/stores" element={<AdminRoute><AdminStores /></AdminRoute>} />
                  <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />

                  <Route path="*" element={<Navigate to="stores" replace />} />
                </Routes>
              </HubLayout>
            </ProtectedRoute>
          } />

          {/* THE STORE WORKSPACE ROUTES */}
          <Route path="/workspace/*" element={
            <ProtectedRoute>
              <StoreLayout>
                <Routes>
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="integration" element={<Integration />} />
                  <Route path="*" element={<Navigate to="reviews" replace />} />
                </Routes>
              </StoreLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}