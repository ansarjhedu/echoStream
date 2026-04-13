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
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

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
    setSaveStatus({ type: '', message: '' });
    try {
      await api.patch(`/store/${activeStore._id}/widget-config`, config);
      setSaveStatus({ type: 'success', message: 'Widget design published live! 🚀' });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const scriptCode = `<!-- 1. Add this to your HTML <head> -->
<script src="https://echo-stream-5nch.vercel.app/widget/echo-widget.js" defer></script>

<!-- 2. Place this where you want the reviews to appear -->
<div 
  class="echo-reviews-widget" 
  data-api-key="${activeStore?.apiKey}" 
  data-product-handle="UNIQUE_PRODUCT_ID" 
  data-product-title="Product Name">
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

      {saveStatus.message && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${saveStatus.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <AlertCircle size={18} /> {saveStatus.message}
        </div>
      )}

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

// =========================================================================
// 🎨 THE LIVE PREVIEW RENDERING ENGINE
// This simulates exactly what the 4 layouts will look like on the client's site.
// Notice the use of styles like `backgroundColor: 'var(--p-color)'`!
// =========================================================================
const WidgetPreviewMockup = ({ layout }) => {
  const reviews =[
    { id: 1, name: "Sarah Jenkins", rating: 5, date: "2 days ago", comment: "Absolutely love the quality. It exceeded my expectations completely!" },
    { id: 2, name: "Marcus Doe", rating: 4, date: "1 week ago", comment: "Great product, but shipping took a little longer than expected." }
  ];

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= rating ? "" : "opacity-30"} style={{ fill: i<=rating ? 'var(--p-color)' : 'none', color: 'var(--p-color)' }} />)}
    </div>
  );

  // 1. GLASSMORPHISM (Current Style)
  if (layout === 'glassmorphism') {
    return (
      <div className="p-6 relative backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-color) 80%, transparent)' }}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
          <h3 className="text-xl font-bold">Customer Reviews</h3>
          <button className="px-4 py-2 rounded-full font-bold text-sm" style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}>Write Review</button>
        </div>
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="p-4 rounded-xl border border-white/10" style={{ backgroundColor: 'color-mix(in srgb, var(--t-color) 3%, transparent)' }}>
              <div className="flex justify-between mb-2">
                <div><span className="font-bold block">{r.name}</span><span className="text-xs opacity-50">{r.date}</span></div>
                {renderStars(r.rating)}
              </div>
              <p className="text-sm opacity-90">{r.comment}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. CLASSIC (Amazon/Yotpo Style - Bars and crisp borders)
  if (layout === 'classic') {
    return (
      <div className="p-6 border border-gray-200" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold m-0">4.5</h3>
              {renderStars(5)}
            </div>
            <div className="text-sm opacity-70">Based on 124 reviews</div>
          </div>
          <button className="px-5 py-2 border font-bold text-sm uppercase tracking-wider rounded-sm hover:opacity-80 transition-opacity" style={{ borderColor: 'var(--p-color)', color: 'var(--p-color)' }}>Write a Review</button>
        </div>
        <hr className="mb-6 opacity-20" style={{ borderColor: 'var(--t-color)' }}/>
        <div className="space-y-6">
          {reviews.map(r => (
            <div key={r.id} className="border-b pb-6 last:border-0" style={{ borderColor: 'color-mix(in srgb, var(--t-color) 15%, transparent)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--p-color) 20%, transparent)', color: 'var(--p-color)' }}>{r.name.charAt(0)}</div>
                <div><span className="font-bold mr-2">{r.name}</span> <span className="text-xs opacity-50">{r.date}</span></div>
              </div>
              <div className="mb-2">{renderStars(r.rating)}</div>
              <p className="text-sm opacity-90">{r.comment}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. MINIMAL (Clean, lots of whitespace, Apple-esque)
  if (layout === 'minimal') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <h3 className="text-2xl font-light mb-2 tracking-wide">Reviews</h3>
        <div className="flex justify-center mb-6">{renderStars(5)}</div>
        <button className="mb-8 text-sm hover:underline" style={{ color: 'var(--p-color)' }}>Add your voice</button>
        <div className="space-y-8 text-left">
          {reviews.map(r => (
            <div key={r.id}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium tracking-wide">{r.name}</span>
                {renderStars(r.rating)}
              </div>
              <p className="text-sm opacity-70 leading-relaxed font-light">"{r.comment}"</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. GRID (Masonry style cards side by side)
  if (layout === 'grid') {
    return (
      <div className="p-6" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">What Customers Say</h3>
          <button className="px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}>Review</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {reviews.map(r => (
            <div key={r.id} className="p-5 rounded-xl shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--t-color) 4%, transparent)' }}>
              <div className="mb-3">{renderStars(r.rating)}</div>
              <p className="text-sm opacity-90 mb-4 line-clamp-3">"{r.comment}"</p>
              <div className="text-xs opacity-60 font-medium">— {r.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
 if (layout === 'carousel') {
    // We add hooks specifically inside the mockup function for the preview!
    const scrollRef = React.useRef(null);
    const [isHovered, setIsHovered] = React.useState(false);

    React.useEffect(() => {
      if (isHovered) return;
      const interval = setInterval(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            scrollRef.current.scrollBy({ left: 250, behavior: 'smooth' });
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }, [isHovered]);

    const scrollPrev = () => scrollRef.current?.scrollBy({ left: -250, behavior: 'smooth' });
    const scrollNext = () => scrollRef.current?.scrollBy({ left: 250, behavior: 'smooth' });

    // Generate some extra dummy reviews so the carousel actually has something to scroll through!
    const mockupReviews =[
      ...reviews, 
      { id: 3, name: "Elena R.", rating: 5, date: "3 weeks ago", comment: "Fast shipping and amazing support team!" },
      { id: 4, name: "David K.", rating: 5, date: "1 month ago", comment: "10/10 would buy again. Fits perfectly into my workflow." }
    ];

    return (
      <div className="p-6 overflow-hidden" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Latest Reviews</h3>
          <button className="text-sm font-bold underline" style={{ color: 'var(--p-color)' }}>Write Review</button>
        </div>

        <div 
          className="relative group/carousel"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--p-color)', border: '1px solid var(--echo-border)' }}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--p-color)', border: '1px solid var(--echo-border)' }}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x scroll-smooth">
            {mockupReviews.map(r => (
              <div key={r.id} className="p-5 rounded-2xl shrink-0 w-[240px] snap-center border shadow-sm flex flex-col justify-between" style={{ backgroundColor: 'color-mix(in srgb, var(--t-color) 2%, transparent)', borderColor: 'var(--echo-border)' }}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold">{r.name}</div>
                    {renderStars(r.rating)}
                  </div>
                  <p className="text-sm opacity-80 line-clamp-3 mb-2">"{r.comment}"</p>
                </div>
                <div className="text-xs opacity-50">{r.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 6. NEO-BRUTALISM (Bold, Sharp, High Contrast)
  if (layout === 'brutalism') {
    return (
      <div className="p-8 border-4 border-black" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
          <h3 className="text-2xl font-black uppercase tracking-widest">Reviews</h3>
          <button className="px-6 py-2 border-2 border-black font-black uppercase tracking-wider hover:-translate-y-1 hover:translate-x-1 transition-transform" style={{ backgroundColor: 'var(--p-color)', color: '#000', boxShadow: '-4px 4px 0px 0px #000' }}>Review</button>
        </div>
        <div className="space-y-6">
          {reviews.map(r => (
            <div key={r.id} className="p-5 border-2 border-black transition-transform hover:-translate-y-1 hover:translate-x-1" style={{ backgroundColor: '#fff', color: '#000', boxShadow: '-6px 6px 0px 0px #000' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-lg">{r.name}</span>
                {renderStars(r.rating)}
              </div>
              <p className="font-medium">"{r.comment}"</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};