import React, { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  Copy, Check, Code, LayoutTemplate, Palette, Type, Save,
  ArrowLeft, Sparkles, SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { canManageWidgets, isPresenceType } from '../utils/permissionHelpers';
import { WIDGET_CATALOG, CatalogLayoutPreview, previewThemeStyle } from '../utils/widgetCatalog.jsx';

const WIDGET_SCRIPT_SRC =
  import.meta.env.VITE_WIDGET_SCRIPT_URL ||
  'https://echo-stream-5nch.vercel.app/widget/echo-widget.js';

const VALID_LAYOUTS = WIDGET_CATALOG.map((w) => w.id);

const DEFAULT_CONFIG = {
  layout: 'glassmorphism',
  primaryColor: '#06b6d4',
  backgroundColor: '#0A0F1A',
  textColor: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  fontWeight: 400,
  titleFontSize: 22,
  lineHeight: 1.5,
  carouselAutoplay: true,
  carouselIntervalMs: 3500,
  carouselShowArrows: true,
};

const SNIPPET_TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'react', label: 'React' },
  { id: 'next', label: 'Next.js' },
];

function buildPresenceHtmlSnippet(apiKey, storeType = 'portfolio', storeName = 'site') {
  const handle = String(storeType || 'portfolio').toLowerCase();
  const title = String(storeName || 'site').toLowerCase();
  return `<!-- EchoStream Presence — paste into any HTML page -->
<script src="${WIDGET_SCRIPT_SRC}" defer></script>

<div
  class="echo-reviews-widget"
  data-echo-widget
  data-api-key="${apiKey || 'YOUR_API_KEY'}"
  data-product-handle="${handle}"
  data-product-title="${title}"
></div>`;
}

function buildCommerceHtmlSnippet(apiKey) {
  return `<!-- 1. Load the widget script (once per page) -->
<script src="${WIDGET_SCRIPT_SRC}" defer></script>

<!-- 2. Place where reviews should appear.
     Generate data-verification-hash on your server:
     HMAC-SHA256(customerEmail, apiKey) — never in the browser. -->
<div
  class="echo-reviews-widget"
  data-echo-widget
  data-api-key="${apiKey || 'YOUR_API_KEY'}"
  data-product-handle="UNIQUE_PRODUCT_ID"
  data-product-title="Product Name"
  data-customer-name="Customer Name"
  data-customer-email="Customer Email"
  data-verification-hash="SERVER_GENERATED_HMAC_SHA256"
></div>`;
}

const REACT_LOAD_HELPER = `const SCRIPT_ID = 'echo-stream-widget';

function loadEchoScript() {
  return new Promise((resolve, reject) => {
    if (window.EchoStream) {
      resolve(window.EchoStream);
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (existing.dataset.echoFailed === '1') {
        existing.remove();
      } else {
        existing.addEventListener('load', () => resolve(window.EchoStream), { once: true });
        existing.addEventListener('error', () => {
          reject(new Error('EchoStream script failed to load: ' + existing.src));
        }, { once: true });
        return;
      }
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.EchoStream) resolve(window.EchoStream);
      else reject(new Error('EchoStream script loaded but window.EchoStream is missing'));
    };
    script.onerror = () => {
      script.dataset.echoFailed = '1';
      reject(new Error('EchoStream script failed to load: ' + SCRIPT_SRC));
    };
    document.head.appendChild(script);
  });
}`;

/** Vite / CRA / plain React — inject script + mount after render */
function buildPresenceReactSnippet(apiKey, storeType = 'portfolio', storeName = 'site') {
  const handle = String(storeType || 'portfolio').toLowerCase();
  const title = String(storeName || 'site').toLowerCase();
  return `// EchoStream Presence — React (Vite / CRA)
// Use className (not class). Mount after the DOM node exists.

import { useEffect, useRef } from 'react';

const SCRIPT_SRC = '${WIDGET_SCRIPT_SRC}';
${REACT_LOAD_HELPER}

export default function EchoReviews() {
  const ref = useRef(null);

  useEffect(() => {
    let active = true;
    const el = ref.current;

    loadEchoScript()
      .then((Echo) => {
        if (active && el) Echo?.mount(el);
      })
      .catch(console.error);

    return () => {
      active = false;
      if (el) window.EchoStream?.unmount(el);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="echo-reviews-widget"
      data-echo-widget=""
      data-api-key="${apiKey || 'YOUR_API_KEY'}"
      data-product-handle="${handle}"
      data-product-title="${title}"
    />
  );
}`;
}

function buildCommerceReactSnippet(apiKey) {
  return `// EchoStream Commerce — React (Vite / CRA)
// verificationHash must be HMAC-SHA256(customerEmail, apiKey) from your server.

import { useEffect, useRef } from 'react';

const SCRIPT_SRC = '${WIDGET_SCRIPT_SRC}';
${REACT_LOAD_HELPER}

export default function EchoProductReviews({
  productHandle,
  productTitle,
  customerName,
  customerEmail,
  verificationHash,
}) {
  const ref = useRef(null);

  useEffect(() => {
    let active = true;
    const el = ref.current;

    loadEchoScript()
      .then((Echo) => {
        if (active && el) Echo?.mount(el);
      })
      .catch(console.error);

    return () => {
      active = false;
      if (el) window.EchoStream?.unmount(el);
    };
  }, [productHandle, customerEmail, verificationHash]);

  return (
    <div
      ref={ref}
      className="echo-reviews-widget"
      data-echo-widget=""
      data-api-key="${apiKey || 'YOUR_API_KEY'}"
      data-product-handle={productHandle}
      data-product-title={productTitle}
      data-customer-name={customerName}
      data-customer-email={customerEmail}
      data-verification-hash={verificationHash}
    />
  );
}`;
}

/** Next.js App Router — Client Component + next/script */
function buildPresenceNextSnippet(apiKey, storeType = 'portfolio', storeName = 'site') {
  const handle = String(storeType || 'portfolio').toLowerCase();
  const title = String(storeName || 'site').toLowerCase();
  return `// EchoStream Presence — Next.js App Router
// Save as a Client Component (e.g. components/EchoReviews.tsx)

'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

const SCRIPT_SRC = '${WIDGET_SCRIPT_SRC}';

export default function EchoReviews() {
  const ref = useRef(null);

  const mount = () => {
    if (ref.current) window.EchoStream?.mount(ref.current);
  };

  useEffect(() => {
    mount();
    return () => {
      if (ref.current) window.EchoStream?.unmount(ref.current);
    };
  }, []);

  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onLoad={mount} />
      <div
        ref={ref}
        className="echo-reviews-widget"
        data-echo-widget=""
        data-api-key="${apiKey || 'YOUR_API_KEY'}"
        data-product-handle="${handle}"
        data-product-title="${title}"
      />
    </>
  );
}`;
}

function buildCommerceNextSnippet(apiKey) {
  return `// EchoStream Commerce — Next.js App Router
// verificationHash: HMAC-SHA256(customerEmail, apiKey) from your server / Route Handler.

'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

const SCRIPT_SRC = '${WIDGET_SCRIPT_SRC}';

export default function EchoProductReviews({
  productHandle,
  productTitle,
  customerName,
  customerEmail,
  verificationHash,
}) {
  const ref = useRef(null);

  const mount = () => {
    if (ref.current) window.EchoStream?.mount(ref.current);
  };

  useEffect(() => {
    mount();
    return () => {
      if (ref.current) window.EchoStream?.unmount(ref.current);
    };
  }, [productHandle, customerEmail, verificationHash]);

  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onLoad={mount} />
      <div
        ref={ref}
        className="echo-reviews-widget"
        data-echo-widget=""
        data-api-key="${apiKey || 'YOUR_API_KEY'}"
        data-product-handle={productHandle}
        data-product-title={productTitle}
        data-customer-name={customerName}
        data-customer-email={customerEmail}
        data-verification-hash={verificationHash}
      />
    </>
  );
}`;
}

function resolveSnippet(mode, presence, store) {
  const key = store?.apiKey;
  const type = store?.storeType;
  const name = store?.storeName;
  if (mode === 'react') {
    return presence
      ? buildPresenceReactSnippet(key, type, name)
      : buildCommerceReactSnippet(key);
  }
  if (mode === 'next') {
    return presence
      ? buildPresenceNextSnippet(key, type, name)
      : buildCommerceNextSnippet(key);
  }
  return presence
    ? buildPresenceHtmlSnippet(key, type, name)
    : buildCommerceHtmlSnippet(key);
}

const SNIPPET_HINTS = {
  html: 'Paste the script once, then drop the div where reviews should appear.',
  react: 'Vite / CRA: use className (not class). The helper loads the script and mounts after render.',
  next: 'App Router Client Component. next/script loads the bundle; mount runs onLoad and in useEffect.',
};

/**
 * Design Lab — design ONLY the layout selected from Widget Catalog.
 */
export default function DesignLab() {
  const { activeStore, setActiveStore, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [needsCatalog, setNeedsCatalog] = useState(false);
  const [snippetMode, setSnippetMode] = useState('html'); // html | react | next

  const presence = isPresenceType(activeStore?.storeType);

  useEffect(() => {
    if (!activeStore) return;

    const fromQuery = searchParams.get('layout');
    const fromSession = sessionStorage.getItem('echo_design_layout');
    const layoutHint = fromQuery || fromSession;
    const wc = activeStore.widgetConfig || {};

    const resolvedLayout = VALID_LAYOUTS.includes(layoutHint)
      ? layoutHint
      : (VALID_LAYOUTS.includes(wc.layout) ? wc.layout : null);

    if (!resolvedLayout) {
      setNeedsCatalog(true);
      setLoading(false);
      return;
    }

    setConfig({
      layout: resolvedLayout,
      primaryColor: wc.primaryColor || DEFAULT_CONFIG.primaryColor,
      backgroundColor: wc.backgroundColor || DEFAULT_CONFIG.backgroundColor,
      textColor: wc.textColor || DEFAULT_CONFIG.textColor,
      fontFamily: wc.fontFamily || DEFAULT_CONFIG.fontFamily,
      fontSize: wc.fontSize || DEFAULT_CONFIG.fontSize,
      fontWeight: wc.fontWeight || DEFAULT_CONFIG.fontWeight,
      titleFontSize: wc.titleFontSize || DEFAULT_CONFIG.titleFontSize,
      lineHeight: wc.lineHeight || DEFAULT_CONFIG.lineHeight,
      carouselAutoplay: wc.carouselAutoplay !== false,
      carouselIntervalMs: wc.carouselIntervalMs || DEFAULT_CONFIG.carouselIntervalMs,
      carouselShowArrows: wc.carouselShowArrows !== false,
    });

    if (layoutHint && VALID_LAYOUTS.includes(layoutHint)) {
      sessionStorage.removeItem('echo_design_layout');
      setDirty(layoutHint !== wc.layout);
    }
    setNeedsCatalog(false);
    setLoading(false);
  }, [activeStore, searchParams]);

  if (!activeStore) {
    return <Navigate to={presence ? '/hub/presence' : '/hub/stores'} replace />;
  }
  if (!canManageWidgets(user)) {
    return <Navigate to="/workspace/analytics/overview" replace />;
  }
  if (!loading && needsCatalog) {
    return <Navigate to="/workspace/widgets" replace />;
  }

  const patchConfig = (partial) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/store/${activeStore._id}/widget-config`, config);
      const nextConfig = res.data?.data || config;
      setActiveStore({ ...activeStore, widgetConfig: nextConfig });
      setDirty(false);
      toast.success('Design published — embed snippet is live for this workspace.');
    } catch {
      toast.error('Failed to publish widget design.');
    } finally {
      setSaving(false);
    }
  };

  const scriptCode = resolveSnippet(snippetMode, presence, activeStore);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      toast.success('Embed code copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  const selectedMeta = WIDGET_CATALOG.find((w) => w.id === config.layout);

  if (loading) {
    return <div className="p-10 text-cyan-400 animate-pulse">Loading Design Lab…</div>;
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 relative overflow-y-auto h-full z-10 w-full flex flex-col no-scrollbar">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <Link
            to="/workspace/widgets"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 mb-3 transition-colors"
          >
            <ArrowLeft size={14} /> Widget Catalog
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Palette className="text-purple-400 shrink-0" size={32} />
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
              Design Lab
            </h1>
          </div>
          <p className="text-gray-400 text-sm flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-cyan-400/80 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} /> {presence ? 'Presence' : 'Commerce'}
            </span>
            Designing <span className="text-white font-semibold">{selectedMeta?.name || config.layout}</span>
            {' '}for {activeStore.storeName}.
            {dirty && (
              <span className="text-[10px] uppercase tracking-wider text-amber-400/90 border border-amber-400/30 px-2 py-0.5 rounded-full">
                Unpublished draft
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePublish}
          disabled={saving}
          className="w-full lg:w-auto min-h-[44px] px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} /> {saving ? 'Publishing…' : 'Save & Publish'}
        </button>
      </div>

      <div className="flex flex-col gap-8 w-full min-h-0">
        <div className="w-full shrink-0 space-y-6 flex flex-col">
          <div className="bg-white/[0.02] border border-cyan-500/30 p-6 rounded-2xl backdrop-blur-xl">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <LayoutTemplate size={18} className="text-cyan-400" /> Selected layout
            </h3>
            <p className="text-lg font-bold text-cyan-300">{selectedMeta?.name}</p>
            <p className="text-sm text-gray-400 mt-1">{selectedMeta?.description}</p>
            <Link
              to="/workspace/widgets"
              className="inline-flex mt-4 text-xs font-bold text-cyan-400 hover:text-cyan-300"
            >
              Change layout in Catalog →
            </Link>
          </div>

          <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Palette size={18} className="text-purple-400" /> Brand Colors
            </h3>
            <div className="space-y-4">
              <ColorPicker
                label="Primary Accent (Stars/Buttons)"
                value={config.primaryColor}
                onChange={(val) => patchConfig({ primaryColor: val })}
              />
              <ColorPicker
                label="Widget Background"
                value={config.backgroundColor}
                onChange={(val) => patchConfig({ backgroundColor: val })}
              />
              <ColorPicker
                label="Text Color"
                value={config.textColor}
                onChange={(val) => patchConfig({ textColor: val })}
              />
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Type size={18} className="text-pink-400" /> Typography
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Font family</label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => patchConfig({ fontFamily: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:outline-none appearance-none"
                >
                  <option value="system-ui, sans-serif">System Default (Modern)</option>
                  <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica / Arial (Clean)</option>
                  <option value="'Georgia', serif">Georgia (Classic Serif)</option>
                  <option value="Georgia, 'Times New Roman', serif">Editorial Serif</option>
                  <option value="'Courier New', monospace">Monospace (Tech)</option>
                  <option value="ui-rounded, 'SF Pro Rounded', system-ui, sans-serif">Rounded UI</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Body size (px)</label>
                  <input
                    type="number"
                    min={12}
                    max={22}
                    value={config.fontSize}
                    onChange={(e) => patchConfig({ fontSize: Number(e.target.value) || 15 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Title size (px)</label>
                  <input
                    type="number"
                    min={16}
                    max={36}
                    value={config.titleFontSize}
                    onChange={(e) => patchConfig({ titleFontSize: Number(e.target.value) || 22 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Font weight</label>
                  <select
                    value={config.fontWeight}
                    onChange={(e) => patchConfig({ fontWeight: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none appearance-none"
                  >
                    <option value={300}>Light (300)</option>
                    <option value={400}>Regular (400)</option>
                    <option value={500}>Medium (500)</option>
                    <option value={600}>Semibold (600)</option>
                    <option value={700}>Bold (700)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Line height</label>
                  <select
                    value={config.lineHeight}
                    onChange={(e) => patchConfig({ lineHeight: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none appearance-none"
                  >
                    <option value={1.3}>Tight (1.3)</option>
                    <option value={1.5}>Normal (1.5)</option>
                    <option value={1.65}>Relaxed (1.65)</option>
                    <option value={1.8}>Loose (1.8)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {config.layout === 'carousel' && (
            <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-emerald-400" /> Carousel Motion
              </h3>
              <div className="space-y-4">
                <ToggleRow
                  label="Autoplay slides"
                  checked={config.carouselAutoplay}
                  onChange={(v) => patchConfig({ carouselAutoplay: v })}
                />
                <ToggleRow
                  label="Show arrow controls"
                  checked={config.carouselShowArrows}
                  onChange={(v) => patchConfig({ carouselShowArrows: v })}
                />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-300">Interval (ms)</span>
                  <input
                    type="number"
                    min={2000}
                    max={12000}
                    step={500}
                    value={config.carouselIntervalMs}
                    onChange={(e) =>
                      patchConfig({ carouselIntervalMs: Number(e.target.value) || 3500 })
                    }
                    className="w-28 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden">
            <div className="bg-black/40 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</span>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
            </div>
            <div
              className="flex-1 p-4 md:p-8 bg-[#f8f9fa] flex justify-center items-center overflow-y-auto no-scrollbar min-h-[320px]"
              style={{
                backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              <div
                className="w-full max-w-2xl rounded-2xl shadow-2xl transition-all duration-500 overflow-hidden"
                style={previewThemeStyle(config)}
              >
                <CatalogLayoutPreview
                  layoutId={config.layout}
                  carouselConfig={{
                    carouselAutoplay: config.carouselAutoplay,
                    carouselIntervalMs: config.carouselIntervalMs,
                    carouselShowArrows: config.carouselShowArrows,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-[#050810] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shrink-0">
            <div className="flex justify-between items-center bg-white/5 px-4 py-3 border-b border-white/10 gap-3 flex-wrap">
              <span className="text-gray-400 font-mono text-sm flex items-center gap-2">
                <Code size={16} />
                {presence ? 'Presence embed' : 'Commerce embed'}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs font-bold">
                  {SNIPPET_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSnippetMode(tab.id);
                        setCopied(false);
                      }}
                      className={`px-3 py-1.5 min-h-[36px] ${
                        snippetMode === tab.id
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 text-xs md:text-sm text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-400/10 px-3 py-1.5 rounded-md min-h-[36px]"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
            <p className="px-4 pt-3 text-[11px] text-amber-400/90 leading-relaxed">
              {SNIPPET_HINTS[snippetMode]}
            </p>
            <pre className="p-4 md:p-6 text-xs font-mono text-purple-300 overflow-x-auto no-scrollbar">
              <code>{scriptCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const ColorPicker = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-gray-300">{label}</span>
    <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1 rounded-lg">
      <span className="text-xs text-gray-500 font-mono pl-2 uppercase">{value}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
      />
    </div>
  </div>
);

const ToggleRow = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 cursor-pointer">
    <span className="text-sm text-gray-300">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-cyan-500' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </label>
);
