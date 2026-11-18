import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import SiteNav from '../components/landing/SiteNav';

const PAGE_TITLE = 'EchoStream Platform | Multi-tenant Review SaaS';
const PAGE_DESCRIPTION = 'EchoStream is a multi-tenant review platform. Software teams operate stores, subscriptions, permissions, and support, and ship an embeddable review widget on React, Vite, Express, and MongoDB.';

const CONTROLS = [
  {
    title: 'One console for the whole service',
    body: 'Owners, stores, live widgets, and open tickets sit on the first screen. A software team can see the load before opening a single tenant.',
    src: '/marketing/admin-overview.png',
    alt: 'Full admin platform overview with 11 owners, 7 stores, 7 active widgets, and 8 open tickets',
  },
  {
    title: 'Every store is a tenant you can open',
    body: 'Live, suspended, and soft-deleted stores stay in one list. Open a workspace, suspend a store, or restore one before the purge window ends.',
    src: '/marketing/admin-stores.png',
    alt: 'Full platform stores screen with live and deleted ecommerce workspaces and their owners',
  },
  {
    title: 'Plans are a control, not a spreadsheet',
    body: 'Free, Growth, and Pro are filtered in the same ledger, including who is renewing. The account owner is the only person who manages billing.',
    src: '/marketing/admin-subscriptions.png',
    alt: 'Full subscriptions screen showing Free, Growth, and Pro counts and plan filters',
  },
  {
    title: 'Support is part of the product',
    body: 'Pending, in progress, and resolved tickets have their own desk. A request can be accepted, declined, or left in the queue for later.',
    src: '/marketing/admin-support.png',
    alt: 'Full admin support desk with total, pending, in progress, and resolved ticket counts',
  },
];

const STACK = [
  ['Dashboard', 'React 19, Vite, Tailwind, React Router'],
  ['Review widget', 'A separate embed built with React and Vite, injected as one snippet'],
  ['API', 'Express, JWT sessions, role and permission checks'],
  ['Data', 'MongoDB with Mongoose, Redis for fast reads'],
  ['Files and mail', 'Cloudinary for images, Nodemailer for review requests'],
  ['Accounts', 'Email login and Google sign-in, bcrypt passwords, Helmet and rate limits'],
];

const SERVICES = [
  'Multi-tenant stores for commerce, portfolios, and blogs',
  'Embeddable review widget with six layouts and a Design Lab',
  'Product review moderation that hides without deleting history',
  'Google Business review import into the same widget',
  'Review-request email campaigns',
  'Team seats with store and platform permissions',
  'Subscriptions on Free, Growth, and Pro',
  'Support queue for the team operating the service',
];

export default function PlatformLanding() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content') || '';
    if (meta) meta.setAttribute('content', PAGE_DESCRIPTION);
    return () => {
      document.title = previousTitle;
      if (meta) meta.setAttribute('content', previousDescription);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      <SiteNav
        links={[
          { href: '#controls', label: 'Controls' },
          { href: '#stack', label: 'Stack' },
          { href: '#services', label: 'Services' },
          { to: '/', label: 'For stores' },
        ]}
        cta={{ to: '/login', label: 'Open console' }}
      />
      <main>
        <section className="px-4 sm:px-6 pt-14 pb-10 max-w-6xl mx-auto">
          <p className="text-red-300 text-xs font-bold uppercase tracking-[0.22em] mb-4">For software teams</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight max-w-3xl leading-[1.05]">
            The whole review platform, not only the widget a store pastes in.
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mt-5 leading-relaxed">
            EchoStream is the product a software team operates. Tenants, plans, permissions, the embed, and the support desk are already in the console. Store owners subscribe to the service. This page is the system behind that service.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="#controls" className="min-h-12 inline-flex items-center justify-center px-6 rounded-2xl font-bold bg-white text-[#070B14]">See the controls</a>
            <Link to="/" className="min-h-12 inline-flex items-center justify-center px-6 rounded-2xl font-bold border border-white/15">Back to the store page</Link>
          </div>
        </section>

        <div id="controls">
          {CONTROLS.map((item) => (
            <section key={item.title} className="px-4 sm:px-6 py-12 border-t border-white/5">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-extrabold max-w-2xl">{item.title}</h2>
                <p className="text-sm sm:text-base text-gray-400 mt-3 mb-6 max-w-2xl leading-relaxed">{item.body}</p>
                <img src={item.src} alt={item.alt} width="1440" height="900" className="w-full h-auto rounded-2xl border border-white/10" loading="lazy" />
              </div>
            </section>
          ))}
        </div>

        <section id="stack" className="px-4 sm:px-6 py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">What the product runs on</h2>
            <p className="text-sm text-gray-400 max-w-2xl mb-8 leading-relaxed">
              The dashboard and the public embed are separate front ends. The API is the shared control plane for accounts, stores, reviews, and billing state.
            </p>
            <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {STACK.map(([name, detail]) => (
                <div key={name} className="rounded-2xl border border-white/10 bg-[#0A0F1A] p-5">
                  <dt className="text-sm font-bold text-cyan-300">{name}</dt>
                  <dd className="text-sm text-gray-300 mt-2 leading-relaxed">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="services" className="px-4 sm:px-6 py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Services already in the platform</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                A team evaluating EchoStream is looking at a review SaaS they can operate: the merchant workspace, the embed, and the admin controls around both.
              </p>
            </div>
            <ul className="space-y-3">
              {SERVICES.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-200">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <footer className="px-4 sm:px-6 py-8 border-t border-white/5 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} EchoStream platform · <Link to="/" className="text-gray-300 hover:text-white">Store owner page</Link> · <Link to="/login" className="text-gray-300 hover:text-white">Log in</Link></p>
      </footer>
    </div>
  );
}
