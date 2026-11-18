import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import mark from '../../assets/logo-mark.png';
import wordmark from '../../assets/logo-wordmark.png';

export default function SiteNav({ links, cta }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const itemClass = 'min-h-11 md:min-h-0 flex items-center px-2 md:px-0 text-sm text-gray-300 hover:text-white';

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070B14]/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" onClick={close} className="flex items-center shrink-0" aria-label="EchoStream home">
          <img src={mark} alt="" className="h-9 w-auto sm:hidden" />
          <img src={wordmark} alt="EchoStream" className="hidden sm:block h-10 lg:h-12 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-6" aria-label="Page">
          {links.map((link) => (
            link.to ? (
              <Link key={link.label} to={link.to} className={itemClass}>{link.label}</Link>
            ) : (
              <a key={link.label} href={link.href} className={itemClass}>{link.label}</a>
            )
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-flex min-h-10 items-center px-3 text-sm font-semibold text-gray-300 hover:text-white">
            Log in
          </Link>
          <Link
            to={cta.to}
            onClick={cta.onClick}
            className="min-h-10 inline-flex items-center px-4 rounded-full bg-white text-[#070B14] text-sm font-bold"
          >
            {cta.label}
          </Link>
          <button
            type="button"
            className="md:hidden min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl border border-white/10 text-white"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="site-menu" className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col" aria-label="Mobile">
          {links.map((link) => (
            link.to ? (
              <Link key={link.label} to={link.to} className={itemClass} onClick={close}>{link.label}</Link>
            ) : (
              <a key={link.label} href={link.href} className={itemClass} onClick={close}>{link.label}</a>
            )
          ))}
          <Link to="/login" className={itemClass} onClick={close}>Log in</Link>
        </nav>
      )}
    </header>
  );
}
