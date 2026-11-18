import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Store, Globe2 } from 'lucide-react';
import { setSignupIntent } from '../utils/permissionHelpers';
import SiteNav from '../components/landing/SiteNav';
import EchoWidgetEmbed from '../components/EchoWidgetEmbed';
import { CatalogLayoutPreview, previewThemeStyle, WIDGET_CATALOG } from '../utils/widgetCatalog.jsx';

const DEMO_WIDGET_API_KEY = import.meta.env.VITE_DEMO_WIDGET_API_KEY || '';
const DEMO_WIDGET_HANDLE = import.meta.env.VITE_DEMO_WIDGET_HANDLE || 'portfolio';
const DEMO_WIDGET_TITLE = import.meta.env.VITE_DEMO_WIDGET_TITLE || 'EchoStream';
const PROMPT_KEY = 'echo-owner-platform-prompt';

const PAGE_TITLE = 'EchoStream | Product Review Widget for Stores';
const PAGE_DESCRIPTION = 'EchoStream helps stores, portfolios, and blogs collect customer reviews, hide the ones that should stay off the storefront, import Google reviews, and embed a review widget.';

const PRICING = [
  { id: 'free', name: 'Free', price: '$0', blurb: 'One site, enough to publish the widget.', highlights: ['1 store or site', '2 team seats', '2 campaigns / month', 'Design Lab and widgets'] },
  { id: 'growth', name: 'Growth', price: '$29', blurb: 'More stores, more seats, review request emails.', highlights: ['5 stores', '10 team seats', '20 campaigns / month', 'Thank-you emails and AI draft'], featured: true },
  { id: 'pro', name: 'Pro', price: '$79', blurb: 'Unlimited workspaces for a growing brand.', highlights: ['Unlimited stores and seats', 'Unlimited campaigns', 'Priority support path', 'Everything in Growth'] },
];

const FEATURES = [
  {
    id: 'analytics',
    title: 'See whether the reviews are working',
    body: 'Average rating, review volume, verified buyers, and how many reviews stay on the storefront. The same screen shows widget impressions after you publish.',
    src: '/marketing/owner-analytics.png',
    alt: 'Full store analytics screen with a 5.0 average rating, four reviews, and a 100 percent approval rate',
  },
  {
    id: 'reviews',
    title: 'Keep the record when you hide a product',
    body: 'Each product keeps its reviews. Hide one from the storefront without deleting the history, then show it again later. Import and export stay on the same page.',
    src: '/marketing/owner-reviews.png',
    alt: 'Full products screen listing reviewed dishes with star ratings and a hide control',
  },
  {
    id: 'widgets',
    title: 'A review widget shoppers already understand',
    body: 'Pick a layout in the catalog. The preview is the embed: stars, a write-a-review button, and the comments. Carousel layouts move. The others stay still until you open them.',
    src: '/marketing/owner-widgets.png',
    alt: 'Full widget catalog screen with a customer reviews preview and a button into Design Lab',
  },
  {
    id: 'design',
    title: 'Publish the snippet from Design Lab',
    body: 'Set the accent, the surface, and the type. Save and publish when the live site is ready. Stores keep reviews grouped per product. A portfolio or blog uses one embed.',
    src: '/marketing/owner-design-lab.png',
    alt: 'Full Design Lab screen with Save and Publish, a glassmorphism layout, and brand color controls',
  },
  {
    id: 'google',
    title: 'Google reviews in the same widget',
    body: 'Connect a Google Business Profile, bring the reviews in, filter by star rating, and publish them through the same catalog and Design Lab path.',
    src: '/marketing/owner-google.png',
    alt: 'Full Google Reviews screen for connecting a business profile and importing reviews',
  },
];

function AudiencePrompt({ onStay, onPlatform }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div role="dialog" aria-modal="true" aria-labelledby="audience-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#10182a] p-6 shadow-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300 font-bold">Before you look around</p>
        <h2 id="audience-title" className="text-2xl font-extrabold mt-2">Are you buying this for a store, or for a software team?</h2>
        <p className="text-sm text-gray-400 mt-3 leading-relaxed">
          This page is the service a store owner subscribes to: reviews, the widget, and Google imports. The platform page is the whole product — admin controls, subscriptions, support, and the stack it runs on.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onStay} className="min-h-11 px-4 rounded-xl border border-white/15 text-sm font-bold">
            I run a store
          </button>
          <button type="button" onClick={onPlatform} className="min-h-11 px-4 rounded-xl bg-cyan-400 text-[#041018] text-sm font-bold">
            Show me the platform
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(false);
  const goCommerce = () => setSignupIntent('commerce');
  const goPresence = () => setSignupIntent('presence');

  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content') || '';
    if (meta) meta.setAttribute('content', PAGE_DESCRIPTION);
    try {
      if (sessionStorage.getItem(PROMPT_KEY) !== '1') setPrompt(true);
    } catch { /* private mode */ }
    return () => {
      document.title = previousTitle;
      if (meta) meta.setAttribute('content', previousDescription);
    };
  }, []);

  const dismiss = () => {
    try { sessionStorage.setItem(PROMPT_KEY, '1'); } catch { /* ignore */ }
    setPrompt(false);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {prompt && (
        <AudiencePrompt
          onStay={dismiss}
          onPlatform={() => {
            dismiss();
            navigate('/platform');
          }}
        />
      )}
      <SiteNav
        links={[
          { href: '#features', label: 'Features' },
          { href: '#widgets', label: 'Widgets' },
          { href: '#pricing', label: 'Pricing' },
          { to: '/platform', label: 'For software teams' },
        ]}
        cta={{ to: '/login?mode=signup&intent=commerce', label: 'Start free', onClick: goCommerce }}
      />
      <main>
        <section className="px-4 sm:px-6 pt-14 pb-8 max-w-6xl mx-auto">
          <p className="text-cyan-300 text-xs font-bold uppercase tracking-[0.22em] mb-4">For store owners</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight max-w-3xl leading-[1.05]">
            Put customer reviews on the site, and keep control of which ones show.
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mt-5 leading-relaxed">
            EchoStream is the review service a store, portfolio, or blog subscribes to. Collect reviews, ask for them by email, import Google reviews, and publish one embed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/login?mode=signup&intent=commerce" onClick={goCommerce} className="min-h-12 inline-flex items-center justify-center gap-2 px-6 rounded-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#070B14]">
              <Store size={18} /> Register a store
            </Link>
            <Link to="/login?mode=signup&intent=presence" onClick={goPresence} className="min-h-12 inline-flex items-center justify-center gap-2 px-6 rounded-2xl font-bold border border-white/15">
              <Globe2 size={18} /> Start a portfolio or blog
            </Link>
          </div>
        </section>

        <div id="features">
          {FEATURES.map((feature) => (
            <section key={feature.id} id={feature.id} className="px-4 sm:px-6 py-12 border-t border-white/5">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-extrabold max-w-2xl">{feature.title}</h2>
                <p className="text-sm sm:text-base text-gray-400 mt-3 mb-6 max-w-2xl leading-relaxed">{feature.body}</p>
                <img src={feature.src} alt={feature.alt} width="1440" height="900" className="w-full h-auto rounded-2xl border border-white/10" loading="lazy" />
              </div>
            </section>
          ))}
        </div>

        <section id="widgets" className="px-4 sm:px-6 py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Six layouts for the embed</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xl">These previews use sample reviews so you can judge the chrome before your own customers write in.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WIDGET_CATALOG.map((layout) => (
                <article key={layout.id} className="rounded-2xl border border-white/10 bg-[#0A0F1A] p-4 flex flex-col">
                  <div className="h-40 mb-4 rounded-xl border border-white/10 overflow-hidden relative bg-[#050810]" style={previewThemeStyle({ primaryColor: '#06b6d4', backgroundColor: '#0A0F1A', textColor: '#ffffff' })}>
                    <div className="absolute inset-0 scale-[0.55] origin-top-left w-[182%] h-[182%] pointer-events-none overflow-hidden">
                      <CatalogLayoutPreview layoutId={layout.id} carouselConfig={{ carouselAutoplay: layout.id === 'carousel', carouselIntervalMs: 2800, carouselShowArrows: true }} />
                    </div>
                  </div>
                  <h3 className="font-bold">{layout.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed flex-1">{layout.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-4 sm:px-6 py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Plans for the account that pays</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xl">Start on Free. Upgrade when you need more stores, seats, or review-request campaigns. Only the account owner manages billing.</p>
            <div className="grid md:grid-cols-3 gap-4">
              {PRICING.map((plan) => (
                <article key={plan.id} className={`rounded-2xl border p-6 flex flex-col ${plan.featured ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10 bg-[#0A0F1A]'}`}>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-3xl font-extrabold mt-2">{plan.price}<span className="text-sm text-gray-500 font-medium"> / mo</span></p>
                  <p className="text-xs text-gray-500 mt-2 mb-4">{plan.blurb}</p>
                  <ul className="text-sm text-gray-300 space-y-2 flex-1 mb-6">
                    {plan.highlights.map((item) => (
                      <li key={item} className="flex gap-2"><Check size={14} className="text-cyan-400 shrink-0 mt-0.5" />{item}</li>
                    ))}
                  </ul>
                  <Link to="/login?mode=signup&intent=commerce" onClick={goCommerce} className={`min-h-11 rounded-xl font-bold text-sm inline-flex items-center justify-center ${plan.featured ? 'bg-cyan-400 text-[#041018]' : 'bg-white/10 border border-white/10'}`}>
                    Get started free
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-extrabold mb-3">The embed, on a page</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-xl">This is the same widget a store pastes into its site.</p>
            {DEMO_WIDGET_API_KEY ? (
              <EchoWidgetEmbed apiKey={DEMO_WIDGET_API_KEY} productHandle={DEMO_WIDGET_HANDLE} productTitle={DEMO_WIDGET_TITLE} />
            ) : (
              <div className="rounded-2xl border border-white/10 overflow-hidden p-4 md:p-6" style={previewThemeStyle({ backgroundColor: '#0A0F1A', textColor: '#ffffff', primaryColor: '#06b6d4' })}>
                <CatalogLayoutPreview layoutId="glassmorphism" />
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="px-4 sm:px-6 py-8 border-t border-white/5 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} EchoStream · <Link to="/platform" className="text-gray-300 hover:text-white">Platform for software teams</Link> · <Link to="/login" className="text-gray-300 hover:text-white">Log in</Link></p>
      </footer>
    </div>
  );
}
