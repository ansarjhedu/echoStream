
import { WidgetProvider, useWidget } from './context/WidgetContext';
import { ShieldAlert } from 'lucide-react';
import GlassmorphismLayout from './components/Layouts/GlassmorphismLayout';
import ClassicLayout from './components/Layouts/ClassicLayout'
import MinimalLayout from './components/Layouts/MinimalLayout'
import GridLayout from './components/Layouts/GridLayout';
import CarouselLayout from './components/Layouts/CarouselLayout';
import BrutalismLayout from './components/Layouts/BrutalismLayout';

function InnerWidget() {
  const { config, widgetError, loading, reviews, stats, isFormOpen, setIsFormOpen } = useWidget();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12" style={{ color: 'var(--echo-primary)' }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'var(--echo-border)', borderTopColor: 'var(--echo-primary)' }}></div>
        <p className="text-sm font-mono tracking-widest animate-pulse">LOADING REVIEWS</p>
      </div>
    );
  }

  if (widgetError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-2xl" style={{ backgroundColor: 'var(--echo-input)', borderColor: '#ef4444', color: '#ef4444' }}>
        <ShieldAlert size={48} className="mb-4" />
        <h3 className="text-xl font-bold mb-2">Widget Offline</h3>
        <p className="text-sm opacity-80">{widgetError}</p>
      </div>
    );
  }

  // --- LAYOUT RENDERING ENGINE ---
 const renderLayout = () => {
    switch (config.layout) {
      case 'classic': return <ClassicLayout />;
      case 'minimal': return <MinimalLayout />;
      case 'grid': return <GridLayout />;
      case 'carousel': return <CarouselLayout />;     // <-- NEW
      case 'brutalism': return <BrutalismLayout />;   // <-- NEW
      case 'glassmorphism': default: return <GlassmorphismLayout />;
    }
  };

  return (
    <div className="echo-widget-root w-full relative rounded-2xl overflow-hidden box-border" 
      style={{
        '--echo-primary': config.primaryColor,
        '--echo-bg': config.backgroundColor,
        '--echo-text': config.textColor,
        // MAGIC CSS: Creates a 15% opacity version of the text color for borders, perfect for dark OR light mode!
        '--echo-border': `color-mix(in srgb, ${config.textColor} 15%, transparent)`,
        '--echo-input': `color-mix(in srgb, ${config.textColor} 5%, transparent)`,
        fontFamily: config.fontFamily,
        backgroundColor: 'var(--echo-bg)',
        color: 'var(--echo-text)'
      }}
    >
      {renderLayout()}
      
      {/* Branding */}
      <div className="pt-6 pb-4 border-t text-center opacity-60 text-xs" style={{ borderColor: 'var(--echo-border)' }}>
        Powered by <strong style={{ color: 'var(--echo-primary)' }}>EchoStream</strong>
      </div>
    </div>
  );
}

export default function WidgetWrapper({ apiKey, productHandle, productTitle, customerName, customerEmail }) {
  return (
    <WidgetProvider apiKey={apiKey} productHandle={productHandle} productTitle={productTitle} customerName={customerName} customerEmail={customerEmail}>
      <InnerWidget />
    </WidgetProvider>
  );
}