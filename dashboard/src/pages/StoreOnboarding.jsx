import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight, Link2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { setSignupIntent } from '../utils/permissionHelpers';

/**
 * Commerce onboarding — paste store URL → meta preview → create → Widget Catalog.
 */
export default function StoreOnboarding() {
  const navigate = useNavigate();
  const { setActiveStore, user } = useAuth();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState('ecommerce');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  if (user?.role === 'staff') {
    return (
      <div className="p-6 md:p-10 max-w-lg mx-auto text-center text-gray-400">
        Only the account owner can register a new store.
      </div>
    );
  }

  const handlePreview = async (e) => {
    e.preventDefault();
    let normalized = url.trim();
    if (!normalized) return toast.error('Paste your store URL.');
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await api.post('/store/preview-url', { url: normalized });
      const meta = res.data.data;
      setPreview(meta);
      setUrl(meta.url || normalized);
      if (meta.siteName || meta.title) {
        setStoreName((meta.siteName || meta.title).slice(0, 80));
      }
      toast.success('Preview loaded.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not preview that URL.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!storeName.trim()) return toast.error('Give your store a name.');
    setCreating(true);
    try {
      const res = await api.post('/store/create', {
        storeName: storeName.trim(),
        storeType,
        websiteUrl: preview?.url || url || null,
        siteMeta: preview
          ? {
              title: preview.title,
              description: preview.description,
              image: preview.image,
              favicon: preview.favicon,
            }
          : undefined,
      });
      const store = res.data.data;
      setSignupIntent('commerce');
      setActiveStore(store);
      toast.success('Store registered — open the Widget Catalog.');
      navigate('/workspace/widgets');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data || 'Failed to create store');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-10 relative overflow-y-auto h-full z-10 w-full no-scrollbar">
      <div className="absolute top-[-8%] right-[-5%] w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-bold mb-2">Commerce</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight flex items-center gap-3 mb-2">
          <Store className="text-cyan-400 shrink-0" /> Register your store
        </h1>
        <p className="text-gray-400 text-sm mb-8 max-w-lg">
          Paste your live store URL. We read Open Graph meta for a preview, then create your workspace and
          send you to the Widget Catalog.
        </p>

        <form
          onSubmit={handlePreview}
          className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 md:p-6 mb-6 backdrop-blur-xl"
        >
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Store URL</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourstore.com"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loadingPreview}
              className="min-h-[44px] px-5 rounded-xl font-bold text-sm bg-white/10 border border-white/10 text-white hover:bg-white/15 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loadingPreview ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {loadingPreview ? 'Fetching…' : 'Preview'}
            </button>
          </div>
        </form>

        {preview && (
          <div className="bg-white/[0.02] border border-cyan-500/20 rounded-2xl overflow-hidden mb-6">
            {preview.image ? (
              <div className="aspect-[2/1] bg-black/40 overflow-hidden">
                <img
                  src={preview.image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="aspect-[3/1] bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                {preview.favicon ? (
                  <img src={preview.favicon} alt="" className="w-12 h-12 rounded" />
                ) : (
                  <Store className="text-cyan-400/50" size={40} />
                )}
              </div>
            )}
            <div className="p-5">
              <p className="text-lg font-bold text-white">{preview.title || preview.siteName || 'Untitled'}</p>
              {preview.description && (
                <p className="text-sm text-gray-400 mt-2 line-clamp-3">{preview.description}</p>
              )}
              <p className="text-[10px] text-gray-500 font-mono mt-3 truncate">{preview.url}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-xl space-y-4"
        >
          <div>
            <label className="block text-xs text-gray-400 mb-1">Store name</label>
            <input
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 text-sm"
              placeholder="My Shop"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 text-sm appearance-none"
            >
              <option value="ecommerce">eCommerce</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !storeName.trim()}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-purple-600 text-white disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create store & open Widgets'}
            <ArrowRight size={16} />
          </button>
          <p className="text-[11px] text-gray-500 text-center">
            Preview is optional — you can create with a name only if the URL is unreachable.
          </p>
        </form>
      </div>
    </div>
  );
}
