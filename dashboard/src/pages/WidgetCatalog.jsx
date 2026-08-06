import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { LayoutTemplate, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canManageWidgets, isPresenceType } from '../utils/permissionHelpers';
import { WIDGET_CATALOG, CatalogLayoutPreview, previewThemeStyle } from '../utils/widgetCatalog.jsx';

/**
 * Shared Widget Catalog — Presence & Commerce.
 * Select a card → Design Lab with that layout preselected.
 */
export default function WidgetCatalog() {
  const { activeStore, user } = useAuth();
  const navigate = useNavigate();
  const presence = isPresenceType(activeStore?.storeType);

  if (!activeStore) {
    return <Navigate to={presence ? '/hub/presence' : '/hub/stores'} replace />;
  }
  if (!canManageWidgets(user)) {
    return <Navigate to="/workspace/analytics/overview" replace />;
  }

  const selectLayout = (layoutId) => {
    sessionStorage.setItem('echo_design_layout', layoutId);
    navigate(`/workspace/design-lab?layout=${layoutId}`);
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 relative overflow-y-auto h-full z-10 w-full no-scrollbar">
      <div className="absolute top-[-8%] right-[-5%] w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-bold mb-2 flex items-center gap-2">
            <Sparkles size={14} /> {presence ? 'Presence' : 'Commerce'} · {activeStore.storeName}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight flex items-center gap-3">
            <LayoutTemplate className="text-cyan-400 shrink-0" /> Widget Catalog
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-2xl">
            Preview every layout. Carousel cards auto-play. Select one to open Design Lab — theme it, then publish
            your embed snippet.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {WIDGET_CATALOG.map((item) => (
            <article
              key={item.id}
              className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl hover:border-cyan-500/40 transition-colors flex flex-col"
            >
              <div
                className="h-56 md:h-64 overflow-hidden relative border-b border-white/5"
                style={{
                  backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                  backgroundColor: '#f1f5f9',
                }}
              >
                <div
                  className="absolute inset-3 rounded-xl shadow-xl overflow-hidden origin-top scale-[0.92] md:scale-100"
                  style={previewThemeStyle(activeStore.widgetConfig)}
                >
                  <div className="pointer-events-none h-full overflow-hidden">
                    <CatalogLayoutPreview
                      layoutId={item.id}
                      carouselConfig={activeStore.widgetConfig}
                    />
                  </div>
                  {item.livePreview && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-[#0A0F1A] px-2 py-1 rounded-full pointer-events-none">
                      Live slides
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-lg font-bold text-white">{item.name}</h2>
                <p className="text-sm text-gray-400 mt-1 flex-1 leading-relaxed">{item.description}</p>
                <p className="text-[10px] uppercase tracking-wider text-cyan-500/70 mt-3 mb-4">
                  Best for · {item.bestFor}
                </p>
                <button
                  type="button"
                  onClick={() => selectLayout(item.id)}
                  className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:opacity-95 transition-opacity"
                >
                  Select & open Design Lab <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
