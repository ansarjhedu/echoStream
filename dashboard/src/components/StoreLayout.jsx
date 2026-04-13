import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { X, Menu, BarChart3,Package,Code,ArrowLeft} from "lucide-react";
const StoreLayout = ({ children }) => {
  const { activeStore, setActiveStore } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setIsMobileMenuOpen(false);

  if (!activeStore) return <Navigate to="/hub/stores" replace />;

  // 🧠 ROUTE-AWARE STATE: Automatically opens if URL contains '/analytics'
  const isAnalyticsActive = location.pathname.includes('/analytics');

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white flex flex-col md:flex-row font-sans selection:bg-cyan-500/30 overflow-hidden">
      
      {/* Mobile Top Bar */}
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

      {/* Sidebar */}
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
            
            {/* NESTED ANALYTICS NAVIGATION */}
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
              
              {/* Smoothly glides open/closed based on the URL route */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out  ${isAnalyticsActive ? 'max-h-40 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-1 pr-2">
                  <Link 
                    to="/workspace/analytics/overview" 
                    onClick={closeMenu} 
                    className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/analytics/overview') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                  >
                    Overview
                  </Link>
                  <Link 
                    to="/workspace/analytics/products" 
                    onClick={closeMenu} 
                    className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${location.pathname.includes('/analytics/products') ? 'text-cyan-400 bg-white/5 font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                  >
                    Products
                  </Link>
                </div>
              </div>
            </div>

            {/* OTHER MAIN TABS */}
            <Link to="/workspace/reviews" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/reviews') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Package size={20} className={location.pathname.includes('/reviews') ? "text-cyan-400" : ""} /> Moderation
            </Link>
            <Link to="/workspace/integration" onClick={closeMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.includes('/integration') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Code size={20} className={location.pathname.includes('/integration') ? "text-purple-400" : ""} /> Integration
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link to="/hub/stores" onClick={() => { closeMenu(); setActiveStore(null); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold">
            <ArrowLeft size={18} /> Back to Hub
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-0 h-[calc(100vh-65px)] md:h-screen custom-scrollbar">
        {children}
      </main>
    </div>
  );
};
export default StoreLayout