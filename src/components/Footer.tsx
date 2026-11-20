import { useApp } from '../context/AppContext';

export function Footer() {
  const { navigate, user } = useApp();

  return (
    <footer className="bg-[#302820] text-[#F8F5EF] border-t border-[#302820]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#F8F5EF]/15">
          <div className="md:col-span-5">
            <p className="font-serif text-2xl tracking-tight text-[#F8F5EF]">Brew &amp; Bliss</p>
            <p className="mt-2 text-sm text-[#EEE8DE]/80 max-w-sm leading-relaxed">
              Slow Mornings. Beautifully Brewed. A modern European café dedicated to single-origin espresso, warm pastry craft, and quiet moments.
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium tracking-wider uppercase text-[#EEE8DE]/60 mb-3">Café</p>
            <ul className="space-y-2 text-sm text-[#EEE8DE]/85">
              <li>
                <button type="button" onClick={() => navigate('/menu')} className="hover:text-white transition-colors cursor-pointer">
                  Menu
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/story')} className="hover:text-white transition-colors cursor-pointer">
                  Our Story
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">
                  Contact
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/cart')} className="hover:text-white transition-colors cursor-pointer">
                  Your Bag
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium tracking-wider uppercase text-[#EEE8DE]/60 mb-3">Account</p>
            <ul className="space-y-2 text-sm text-[#EEE8DE]/85">
              {user ? (
                <li>
                  <button type="button" onClick={() => navigate('/account')} className="hover:text-white transition-colors cursor-pointer">
                    My Profile &amp; Orders
                  </button>
                </li>
              ) : (
                <>
                  <li>
                    <button type="button" onClick={() => navigate('/login')} className="hover:text-white transition-colors cursor-pointer">
                      Sign In
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => navigate('/signup')} className="hover:text-white transition-colors cursor-pointer">
                      Create Account
                    </button>
                  </li>
                </>
              )}
              <li>
                <button type="button" onClick={() => navigate('/admin')} className="hover:text-white transition-colors cursor-pointer">
                  Staff Admin Portal
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-medium tracking-wider uppercase text-[#EEE8DE]/60 mb-3">Visit Us</p>
            <p className="text-sm text-[#EEE8DE]/85 leading-relaxed">
              24 Rue des Rosiers, Willow Quarter
              <br />
              Mon–Fri · 07:30 – 18:00
              <br />
              Sat–Sun · 08:30 – 19:00
            </p>
            <p className="mt-3 text-sm text-[#EEE8DE]/75">hello@brewandbliss.cafe</p>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#EEE8DE]/60">
          <p>&copy; {new Date().getFullYear()} Brew &amp; Bliss Café. All rights reserved.</p>
          <p>Freshly roasted · Baked each dawn</p>
        </div>
      </div>
    </footer>
  );
}
