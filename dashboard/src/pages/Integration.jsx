import React, { useState, useEffect } from 'react';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { 
  Copy, Check, Code, LayoutTemplate, Palette, Type, 
  Save, AlertCircle, Star, MessageSquare 
} from 'lucide-react';


export default function Integration() {
  const { activeStore } = useAuth();
  const[copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const[saving, setSaving] = useState(false);

  // Default configuration
  const [config, setConfig] = useState({
    layout: 'glassmorphism',
    primaryColor: '#06b6d4',
    backgroundColor: '#0A0F1A',
    textColor: '#ffffff',
    fontFamily: 'system-ui, sans-serif'
  });

  // Load existing config if they already saved one
  useEffect(() => {
    if (activeStore) {
      if (activeStore.widgetConfig) {
        setConfig({
          layout: activeStore.widgetConfig.layout || 'glassmorphism',
          primaryColor: activeStore.widgetConfig.primaryColor || '#06b6d4',
          backgroundColor: activeStore.widgetConfig.backgroundColor || '#0A0F1A',
          textColor: activeStore.widgetConfig.textColor || '#ffffff',
          fontFamily: activeStore.widgetConfig.fontFamily || 'system-ui, sans-serif'
        });
      }
      setLoading(false);
    }
  }, [activeStore]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/store/${activeStore._id}/widget-config`, config);
      toast.success("Widget configuration saved successfully!");
    } catch (error) {
      toast.error("Failed to save widget configuration");
    } finally {
      setSaving(false);
    }
  };

  const scriptCode = `<!-- 1. Add this to your HTML <head> -->
<script src="https://echo-stream-5nch.vercel.app/widget/echo-widget.js" defer></script>

<!-- 2. Place this where you want the reviews to appear
note: Make sure to replace the placeholder values with actual product and customer data -->
<div 
  class="echo-reviews-widget" 
  data-api-key="${activeStore?.apiKey}" 
  data-product-handle="UNIQUE_PRODUCT_ID" 
  data-product-title="Product Name"
  data-customer-name="Customer Name"
  data-customer-email="Customer Email"
>
</div>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-10 text-cyan-400 animate-pulse">Loading Studio...</div>;

  return (
    <div className="p-4 md:p-8 lg:p-10 relative overflow-y-auto h-full z-10 w-full flex flex-col no-scrollbar">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Palette className="text-purple-400" size={32} />
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
              Widget Studio
            </h1>
          </div>
          <p className="text-gray-400">Design your widget to perfectly match your brand.</p>
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} /> {saving ? 'Publishing...' : 'Save & Publish'}
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 w-full min-h-0">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="w-full xl:w-[400px] shrink-0 space-y-6">
          
          {/* Layout Selector */}
          <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><LayoutTemplate size={18} className="text-cyan-400"/> Layout Style</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'glassmorphism', label: 'Glassmorphism' },
                { id: 'classic', label: 'Classic Store' },
                { id: 'minimal', label: 'Minimalist' },
                { id: 'grid', label: 'Masonry Grid' },
                { id: 'carousel', label: 'Swipe Carousel' },   // <-- NEW
                { id: 'brutalism', label: 'Neo-Brutalism' } 
              ].map(layout => (
                <button 
                  key={layout.id}
                  onClick={() => setConfig({...config, layout: layout.id})}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${config.layout === layout.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'}`}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Palette size={18} className="text-purple-400"/> Brand Colors</h3>
            <div className="space-y-4">
              <ColorPicker label="Primary Accent (Stars/Buttons)" value={config.primaryColor} onChange={(val) => setConfig({...config, primaryColor: val})} />
              <ColorPicker label="Widget Background" value={config.backgroundColor} onChange={(val) => setConfig({...config, backgroundColor: val})} />
              <ColorPicker label="Text Color" value={config.textColor} onChange={(val) => setConfig({...config, textColor: val})} />
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Type size={18} className="text-pink-400"/> Typography</h3>
            <select 
              value={config.fontFamily} 
              onChange={(e) => setConfig({...config, fontFamily: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:outline-none appearance-none"
            >
              <option value="system-ui, sans-serif">System Default (Modern)</option>
              <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica / Arial (Clean)</option>
              <option value="'Georgia', serif">Georgia (Classic Serif)</option>
              <option value="'Courier New', monospace">Monospace (Tech)</option>
            </select>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW & CODE */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Live Preview Engine */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden">
            <div className="bg-black/40 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</span>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
              </div>
            </div>
            
            {/* The MAGIC Sandbox - Injects CSS Variables! */}
            <div className="flex-1 p-4 md:p-8 bg-[#f8f9fa] flex justify-center items-center overflow-y-auto no-scrollbar" style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              
              <div 
                className="w-full max-w-2xl rounded-2xl shadow-2xl transition-all duration-500 overflow-hidden"
                style={{ 
                  '--p-color': config.primaryColor, 
                  '--bg-color': config.backgroundColor, 
                  '--t-color': config.textColor, 
                  fontFamily: config.fontFamily,
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--t-color)'
                }}
              >
                <WidgetPreviewMockup layout={config.layout} />
              </div>

            </div>
          </div>

          {/* Integration Code */}
          <div className="bg-[#050810] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shrink-0">
            <div className="flex justify-between items-center bg-white/5 px-4 py-3 border-b border-white/10">
              <span className="text-gray-400 font-mono text-sm flex items-center gap-2"><Code size={16}/> Embed Code</span>
              <button onClick={copyToClipboard} className="flex items-center gap-2 text-xs md:text-sm text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-400/10 px-3 py-1.5 rounded-md">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre className="p-4 md:p-6 text-xs font-mono text-purple-300 overflow-x-auto no-scrollbar">
              <code>{scriptCode}</code>
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}

// Mini Color Picker Component
const ColorPicker = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-300">{label}</span>
    <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1 rounded-lg">
      <span className="text-xs text-gray-500 font-mono pl-2 uppercase">{value}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
    </div>
  </div>
);

// Shared dummy data for the previews
const MOCK_REVIEWS =[
  { id: 1, name: "Sarah Jenkins", rating: 5, date: "2 days ago", comment: "Absolutely love the quality. It exceeded my expectations completely!" },
  { id: 2, name: "Marcus Doe", rating: 4, date: "1 week ago", comment: "Great product, but shipping took a little longer than expected." }
];

// Reusable star renderer for the mockups
export const RenderMockupStars = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star 
        key={i} 
        size={14} 
        className={i <= rating ? "" : "opacity-30"} 
        style={{ fill: i <= rating ? 'var(--p-color)' : 'none', color: 'var(--p-color)' }} 
      />
    ))}
  </div>
);

// The Orchestrator: It imports the separate files and renders the chosen one.
import GlassmorphismMockup from '../components/widget-mockups/GlassmorphismMockup';
import ClassicMockup from '../components/widget-mockups/ClassicMockup';
import MinimalMockup from '../components/widget-mockups/MinimalMockup';
import GridMockup from '../components/widget-mockups/GridMockup';
import CarouselMockup from '../components/widget-mockups/CarouselMockup';
import BrutalismMockup from '../components/widget-mockups/BrutalismMockup';
import { toast } from 'react-toastify';

const WidgetPreviewMockup = ({ layout }) => {
  switch (layout) {
    case 'classic': return <ClassicMockup reviews={MOCK_REVIEWS} />;
    case 'minimal': return <MinimalMockup reviews={MOCK_REVIEWS} />;
    case 'grid': return <GridMockup reviews={MOCK_REVIEWS} />;
    case 'carousel': return <CarouselMockup reviews={MOCK_REVIEWS} />;
    case 'brutalism': return <BrutalismMockup reviews={MOCK_REVIEWS} />;
    case 'glassmorphism': default: return <GlassmorphismMockup reviews={MOCK_REVIEWS} />;
  }
};