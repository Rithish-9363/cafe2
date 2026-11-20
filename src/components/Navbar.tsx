import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { PageRoute } from '../types';

export function Navbar() {
  const { route, navigate, user, cartCount } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const accountRoute: PageRoute = !user ? '/login' : user.role === 'admin' ? '/admin' : '/account';
  const accountLabel = !user ? 'Sign In' : user.role === 'admin' ? 'Admin' : 'Account';

  const navItems: Array<{ label: string; to: PageRoute }> = [
    { label: 'Home', to: '/' },
    { label: 'Menu', to: '/menu' },
    { label: 'Our Story', to: '/story' },
    { label: 'Contact', to: '/contact' },
    { label: accountLabel, to: accountRoute },
  ];

  const handleNav = (to: PageRoute) => {
    setMobileOpen(false);
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F8F5EF]/95 backdrop-blur-sm border-b border-[#302820]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('/')}
          className="font-serif text-xl sm:text-2xl tracking-tight text-[#302820] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#76563E]"
        >
          Brew &amp; Bliss
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#302820]/75" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = route === item.to || (item.to === '/account' && route === '/account');
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => handleNav(item.to)}
                className={`whitespace-nowrap shrink-0 py-1 border-b transition-colors cursor-pointer ${
                  active
                    ? 'text-[#302820] border-[#76563E]'
                    : 'border-transparent hover:text-[#302820] hover:border-[#302820]/30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('/cart')}
            className="px-4 py-2 text-sm font-medium bg-[#302820] text-[#F8F5EF] hover:bg-[#76563E] transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            Bag ({cartCount})
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-[#302820] hover:bg-[#EEE8DE] transition-colors cursor-pointer"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#302820]/10 bg-[#F8F5EF] px-4 py-4">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const active = route === item.to;
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleNav(item.to)}
                  className={`text-left px-3 py-2.5 text-base font-medium transition-colors cursor-pointer ${
                    active ? 'bg-[#EEE8DE] text-[#302820]' : 'text-[#302820]/80 hover:bg-[#EEE8DE]/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            {user && user.role === 'admin' && (
              <button
                type="button"
                onClick={() => handleNav('/account')}
                className="text-left px-3 py-2.5 text-base font-medium text-[#302820]/80 hover:bg-[#EEE8DE]/60 cursor-pointer"
              >
                My Account
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
