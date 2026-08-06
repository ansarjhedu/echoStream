import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Store,
  Globe2,
  LayoutTemplate,
  Palette,
  Star,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { setSignupIntent } from "../utils/permissionHelpers";
import logo from "../assets/logo.png";
import EchoWidgetEmbed from "../components/EchoWidgetEmbed";
import { CatalogLayoutPreview, previewThemeStyle } from "../utils/widgetCatalog.jsx";

/** Optional live demo — set in dashboard .env, never commit real keys */
const DEMO_WIDGET_API_KEY = import.meta.env.VITE_DEMO_WIDGET_API_KEY || "";
const DEMO_WIDGET_HANDLE = import.meta.env.VITE_DEMO_WIDGET_HANDLE || "portfolio";
const DEMO_WIDGET_TITLE = import.meta.env.VITE_DEMO_WIDGET_TITLE || "EchoStream";

const layouts = [
  {
    name: "Glassmorphism",
    blurb: "Frosted panels that feel premium on any dark host page.",
  },
  {
    name: "Classic",
    blurb: "Amazon-style distribution bars shoppers already trust.",
  },
  {
    name: "Carousel",
    blurb: "Auto-play social proof with snap, arrows, and pause-on-hover.",
  },
  {
    name: "Minimal",
    blurb: "Quiet typography for portfolios and editorial blogs.",
  },
  { name: "Grid", blurb: "Dense masonry of voices for high-volume catalogs." },
  {
    name: "Brutalism",
    blurb: "Hard borders and offset shadows that refuse to be ignored.",
  },
];

export default function LandingPage() {
  const goPresence = () => setSignupIntent("presence");
  const goCommerce = () => setSignupIntent("commerce");

  return (
    <div className="min-h-screen bg-[#070B14] text-white overflow-x-hidden selection:bg-cyan-500/30">
      {/* Atmosphere */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -left-24 w-[42rem] h-[42rem] rounded-full bg-cyan-500/15 blur-[140px] animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-[36rem] h-[36rem] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 backdrop-blur-md bg-[#070B14]/60">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="EchoStream"
            className="h-8 w-auto object-contain drop-shadow-[0_0_16px_rgba(34,211,238,0.55)]"
          />
          <span className="font-black tracking-tighter text-lg">
            EchoStream
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#use-cases" className="hover:text-white transition-colors">
            Use cases
          </a>
          <a href="#widgets" className="hover:text-white transition-colors">
            Widgets
          </a>
          <a href="#design-lab" className="hover:text-white transition-colors">
            Design Lab
          </a>
          <a href="#google" className="hover:text-white transition-colors">
            Google Reviews
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-bold text-gray-300 hover:text-white px-3 py-2"
          >
            Log in
          </Link>
          <Link
            to="/login?mode=signup&intent=presence"
            onClick={goPresence}
            className="hidden sm:inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-full font-bold text-sm bg-white/5 border border-white/10 hover:bg-white/10"
          >
            Get started <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-6 md:px-12 pt-16 md:pt-24 pb-20 max-w-6xl mx-auto">
        <p className="text-cyan-400/90 text-xs font-bold uppercase tracking-[0.25em] mb-5 animate-[fadeInDown_0.6s_ease]">
          Trust widgets for stores, portfolios & blogs
        </p>
        <h1 className="font-black tracking-tight text-4xl sm:text-5xl md:text-7xl leading-[1.05] max-w-4xl mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-emerald-300">
            EchoStream
          </span>
          <span className="block text-white/90 mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold">
            Social proof that ships in one snippet.
          </span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
          Design a review widget in the Lab, publish, and paste. Commerce sites
          get product-aware embeds; portfolios and blogs get API-key-only embeds
          — plus optional Google Business imports.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Link
            to="/login?mode=signup&intent=presence"
            onClick={goPresence}
            className="min-h-[48px] inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#070B14] shadow-[0_0_40px_rgba(34,211,238,0.25)] hover:opacity-95 transition-opacity"
          >
            <Globe2 size={20} /> Start with Portfolio / Blog
          </Link>
          <Link
            to="/login?mode=signup&intent=commerce"
            onClick={goCommerce}
            className="min-h-[48px] inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl font-bold border border-cyan-500/40 text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
          >
            <Store size={20} /> Register a Store
          </Link>
        </div>
      </section>

      {/* USE CASES */}
      <section
        id="use-cases"
        className="relative z-10 px-6 md:px-12 py-20 border-t border-white/5"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Built for three kinds of proof
          </h2>
          <p className="text-gray-500 mb-10 max-w-xl text-sm">
            One platform. Workspace mode adapts the dashboard — not a separate
            product login.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Store,
                title: "eCommerce",
                body: "Product handles, verified buyers, moderation, disputes, and rating analytics your merchants already expect.",
                accent: "from-cyan-500/20 to-transparent border-cyan-500/20",
              },
              {
                icon: Globe2,
                title: "Portfolio",
                body: "Client praise without SKUs. API-key embed, Design Lab theming, and Google Reviews when you want local trust.",
                accent:
                  "from-emerald-500/20 to-transparent border-emerald-500/20",
              },
              {
                icon: Sparkles,
                title: "Blog / Content",
                body: "Editorial social proof beside articles. Same widget catalog — quieter chrome, presence analytics instead of product grids.",
                accent:
                  "from-violet-500/20 to-transparent border-violet-500/20",
              },
            ].map((card) => (
              <article
                key={card.title}
                className={`rounded-2xl border bg-gradient-to-b ${card.accent} p-6 backdrop-blur-sm hover:-translate-y-1 transition-transform duration-300`}
              >
                <card.icon className="text-white mb-4" size={28} />
                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {card.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WIDGETS */}
      <section
        id="widgets"
        className="relative z-10 px-6 md:px-12 py-20 bg-white/[0.015]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2">
                <LayoutTemplate className="text-cyan-400" /> Widget catalog
              </h2>
              <p className="text-gray-500 text-sm">
                Pick a layout card, then open Design Lab. Carousel previews move
                — other cards stay still.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {layouts.map((l, i) => (
              <div
                key={l.name}
                className="group rounded-2xl border border-white/10 bg-[#0A0F1A]/80 p-5 hover:border-cyan-500/40 transition-colors"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-28 mb-4 rounded-xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent overflow-hidden relative">
                  {l.name === "Carousel" ? (
                    <div className="absolute inset-0 flex items-center gap-3 px-4 animate-[marquee_8s_linear_infinite]">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="shrink-0 w-28 h-16 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs text-cyan-200/80"
                        >
                          Slide {n}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="absolute inset-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={10}
                            className="text-cyan-400 fill-cyan-400"
                          />
                        ))}
                      </div>
                      <div className="h-2 w-3/4 bg-white/10 rounded mb-1" />
                      <div className="h-2 w-1/2 bg-white/5 rounded" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold group-hover:text-cyan-300 transition-colors">
                  {l.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {l.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DESIGN LAB */}
      <section
        id="design-lab"
        className="relative z-10 px-6 md:px-12 py-20 border-t border-white/5"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3 flex items-center gap-2">
              <Palette className="text-emerald-400" /> Design Lab
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Live preview of the layout you selected. Tune colors, typography,
              card density, avatar visibility, and carousel controls — arrows,
              speed, cards per view, hover pause — then Publish for a copy-ready
              snippet.
            </p>
            <ul className="space-y-3 text-sm text-gray-300">
              {[
                "Presence embeds: API key only — no product title fields",
                "Commerce embeds: product handle + optional verified-buyer HMAC",
                "Draft vs Publish so unfinished experiments never hit production",
              ].map((t) => (
                <li key={t} className="flex gap-2 items-start">
                  <ChevronRight
                    size={16}
                    className="text-emerald-400 shrink-0 mt-0.5"
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 p-6 md:p-8 shadow-2xl">
            <div className="rounded-2xl border border-white/10 bg-[#0A0F1A] p-4 mb-4">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500 mb-3">
                <span>Preview</span>
                <span className="text-emerald-400">Live</span>
              </div>
              <div className="space-y-3">
                <div className="h-16 rounded-xl bg-white/[0.04] border border-white/5" />
                <div className="h-16 rounded-xl bg-white/[0.04] border border-white/5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Primary", "Surface", "Type"].map((label) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 p-3 text-center"
                >
                  <div className="w-8 h-8 rounded-full mx-auto mb-2 bg-gradient-to-br from-cyan-400 to-emerald-400" />
                  <p className="text-[10px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GOOGLE */}
      <section
        id="google"
        className="relative z-10 px-6 md:px-12 py-20 bg-white/[0.015]"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 md:items-center">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
              Google Reviews
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Connect Google Business Profile, import reviews, keep or hide by
              rating, then drop them into the same Widget Catalog → Design Lab →
              Publish path. One embed runtime — native and Google sources
              together.
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-white/10 p-6 bg-[#0A0F1A]/80">
            <ol className="space-y-4 text-sm">
              {[
                "Connect your Business Profile",
                "Filter by star rating",
                "Choose a layout & theme in Design Lab",
                "Copy the snippet to your site",
              ].map((step, i) => (
                <li key={step} className="flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/15 text-cyan-300 font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS + TRUST */}
      <section className="relative z-10 px-6 md:px-12 py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-extrabold mb-6">How it works</h2>
            <ol className="space-y-5">
              {[
                {
                  t: "Create",
                  d: "Presence site or commerce store — two clear CTAs from day one.",
                },
                {
                  t: "Design",
                  d: "Catalog → Design Lab. Tune every visual control that matters.",
                },
                {
                  t: "Publish",
                  d: "Copy the embed. Presence needs only an API key.",
                },
                {
                  t: "Prove",
                  d: "Analytics, tickets, and optional Google sync stay in one Hub.",
                },
              ].map((s, i) => (
                <li key={s.t} className="flex gap-4">
                  <span className="text-3xl font-black text-white/10 leading-none">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold">{s.t}</p>
                    <p className="text-sm text-gray-500">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-3xl border border-white/10 p-8 bg-gradient-to-br from-white/[0.04] to-transparent">
            <ShieldCheck className="text-cyan-400 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">
              Trust without the theater
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Commerce verified buyers use server-side HMAC — never computed in
              the browser. Disputes escalate to platform review. Presence sites
              stay simple: no fake product fields in the snippet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/login?mode=signup&intent=presence"
                onClick={goPresence}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-400 text-[#070B14]"
              >
                Start free — Presence
              </Link>
              <Link
                to="/login?mode=signup&intent=commerce"
                onClick={goCommerce}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border border-white/15 hover:bg-white/5"
              >
                Register a Store
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* TESTIMONIALS */}
      <section
        id="testimonials"
        className="relative z-10 px-6 md:px-12 py-20 border-t border-white/5"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Testimonials
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-xl">
            Live social proof from an EchoStream Presence widget — the same embed your customers paste into their site.
          </p>
          {DEMO_WIDGET_API_KEY ? (
            <EchoWidgetEmbed
              apiKey={DEMO_WIDGET_API_KEY}
              productHandle={DEMO_WIDGET_HANDLE}
              productTitle={DEMO_WIDGET_TITLE}
            />
          ) : (
            <div
              className="rounded-2xl border border-white/10 overflow-hidden p-4 md:p-6"
              style={previewThemeStyle({
                backgroundColor: "#0A0F1A",
                textColor: "#ffffff",
                primaryColor: "#06b6d4",
                fontFamily: "system-ui, sans-serif",
              })}
            >
              <CatalogLayoutPreview layoutId="glassmorphism" />
            </div>
          )}
        </div>
      </section>

      <footer className="relative z-10 px-6 md:px-12 py-10 border-t border-white/5 text-center text-xs text-gray-600">
        <p>
          © {new Date().getFullYear()} EchoStream ·{" "}
          <Link to="/login" className="text-gray-400 hover:text-white">
            Log in
          </Link>
        </p>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-40%); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
