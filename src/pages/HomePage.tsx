import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Product } from '../types';
import { CoffeeMoodSection } from '../components/CoffeeMoodSection';
import { EditorialImage } from '../components/EditorialImage';

const TESTIMONIALS = [
  {
    quote:
      'Before discovering Brew & Bliss, my weekday commute meant rushed paper-cup espresso. Now I stop ten minutes early for their Velvet Flat White and a warm almond croissant—the calm atmosphere completely resets my morning.',
    name: 'Clara Moreau',
    role: 'Architectural Editor, Atelier Nord',
  },
  {
    quote:
      'Our studio switched our Friday client mornings to Brew & Bliss pre-orders. Everything arrives warm, consistently extracted, and packaged without clutter—their single-origin V60 has become a team ritual.',
    name: 'Henrik Lindqvist',
    role: 'Design Director, Studio Lindqvist',
  },
  {
    quote:
      'Rarely do you find a European café that treats ceremonial matcha and French viennoiserie with the exact same discipline as espresso. The Cold Brew Citrus Tonic is unmatched on warm afternoons.',
    name: 'Sophie Delacroix',
    role: 'Culinary Writer & Food Stylist',
  },
];

export function HomePage({ onSelectProduct }: { onSelectProduct: (p: Product) => void }) {
  const { navigate, products, addToCart } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterFeedback, setNewsletterFeedback] = useState('');

  const featuredProducts = products.filter((p) => p.availability === 1 && p.featured === 1).slice(0, 6);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) {
      setNewsletterStatus('error');
      setNewsletterFeedback('Please enter your email address.');
      return;
    }
    setNewsletterStatus('loading');
    setNewsletterFeedback('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setNewsletterStatus('error');
        setNewsletterFeedback(data.error || 'Unable to subscribe right now.');
        return;
      }
      setNewsletterStatus('success');
      setNewsletterFeedback(data.message || 'Subscribed to the Brew & Bliss Journal.');
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('error');
      setNewsletterFeedback('Network error. Please try again.');
    }
  };

  return (
    <div>
      {/* 1. Editorial Hero Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center py-4 lg:py-8">
            <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-4">
              Slow Mornings · Beautifully Brewed
            </p>
            <h1 className="font-serif text-[clamp(2.25rem,4vw,3.75rem)] leading-[1.08] tracking-tight text-[#302820]">
              Coffee is a little ritual. Make it beautiful.
            </h1>
            <p className="mt-6 text-base text-[#302820]/75 leading-relaxed max-w-md">
              Single-origin espresso pulled to order, seventy-two-hour laminated pastries, and unhurried European hospitality in the heart of Willow Quarter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/menu')}
                className="px-6 py-3.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Explore Menu
              </button>
              <button
                type="button"
                onClick={() => navigate('/story')}
                className="px-6 py-3.5 border border-[#302820]/25 text-[#302820] text-sm font-medium hover:border-[#302820] hover:bg-[#EEE8DE]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Our Story
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 min-h-[320px] lg:min-h-[520px] bg-[#EEE8DE] overflow-hidden">
            <EditorialImage
              src="/src/assets/images/hero_cafe_morning_1795207091329.jpg"
              alt="Sunlit Brew & Bliss European café interior with travertine counter and morning coffee"
              className="w-full h-full object-cover"
              eager
            />
          </div>
        </div>
      </section>

      {/* 2. Special Feature: The Coffee Mood */}
      <CoffeeMoodSection onSelectProduct={onSelectProduct} />

      {/* 3. Signature Coffee Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-10 border-b border-[#302820]/10">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
              House Signatures
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#302820] tracking-tight">
              Crafted for the morning table
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/menu')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#76563E] hover:text-[#302820] whitespace-nowrap shrink-0 cursor-pointer"
          >
            View full menu <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map((product) => (
            <article
              key={product.productId}
              className="bg-white border border-[#302820]/10 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div>
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="block w-full aspect-[4/3] overflow-hidden bg-[#EEE8DE] cursor-pointer"
                >
                  <EditorialImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                  />
                </button>
                <div className="p-6">
                  <p className="text-xs text-[#76563E] mb-1.5">
                    {product.category} · {product.moodTag}
                  </p>
                  <h3 className="font-serif text-xl text-[#302820] leading-snug">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="text-left hover:text-[#76563E] transition-colors cursor-pointer"
                    >
                      {product.name}
                    </button>
                  </h3>
                  <p className="mt-2.5 text-sm text-[#302820]/70 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-3 flex items-center justify-between gap-4 border-t border-[#302820]/5">
                <span className="text-base font-medium text-[#302820] tabular-nums">
                  ${product.price.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => addToCart(product, 1)}
                  className="px-4 py-2 text-xs font-medium bg-[#302820] text-[#F8F5EF] hover:bg-[#76563E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Add to Bag
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Brand Story Editorial Feature */}
      <section className="bg-white border-y border-[#302820]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-6 aspect-[4/3] lg:aspect-auto bg-[#EEE8DE] overflow-hidden">
              <EditorialImage
                src="/src/assets/images/story_roastery_pour_1795207091832.jpg"
                alt="Barista hand-pouring single-origin V60 filter coffee"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center py-2">
              <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-3">
                Our Philosophy
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#302820] leading-tight">
                Unhurried roasting, deliberate extraction, warm linen mornings.
              </h2>
              <p className="mt-5 text-base text-[#302820]/75 leading-relaxed">
                Born from a love of European café salons, Brew &amp; Bliss treats every cup as a quiet pause in the day. We roast small lots from washed highland farms in Ethiopia, Kenya, and Colombia, pairing them with Normandy-butter pastries laminated in-house before sunrise.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6 pt-6 border-t border-[#302820]/10">
                <div>
                  <p className="font-serif text-2xl text-[#302820] tabular-nums">72 hrs</p>
                  <p className="text-xs text-[#302820]/65 mt-1">Cold pastry fermentation</p>
                </div>
                <div>
                  <p className="font-serif text-2xl text-[#302820] tabular-nums">93°C</p>
                  <p className="text-xs text-[#302820]/65 mt-1">Precision brew temperature</p>
                </div>
                <div>
                  <p className="font-serif text-2xl text-[#302820] tabular-nums">100%</p>
                  <p className="text-xs text-[#302820]/65 mt-1">Single-origin trace lots</p>
                </div>
              </div>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/story')}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-[#302820]/25 text-sm font-medium text-[#302820] hover:bg-[#F8F5EF] transition-colors cursor-pointer"
                >
                  Read Our Story <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Café Gallery & Customer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="mb-10">
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
            At the Café
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#302820] tracking-tight">
            Inside Willow Quarter
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <figure className="bg-white border border-[#302820]/10 overflow-hidden">
            <div className="aspect-[4/3] bg-[#EEE8DE]">
              <EditorialImage
                src="/src/assets/images/gallery_bakery_table_1795207093049.jpg"
                alt="Morning croissants and cappuccino on travertine café table"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="p-4 text-xs text-[#302820]/70">
              Morning service · Warm croissants and cappuccino on travertine
            </figcaption>
          </figure>
          <figure className="bg-white border border-[#302820]/10 overflow-hidden">
            <div className="aspect-[4/3] bg-[#EEE8DE]">
              <EditorialImage
                src="/src/assets/images/gallery_cafe_seating_1795207095816.jpg"
                alt="Quiet sunlit reading corner inside Brew & Bliss"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="p-4 text-xs text-[#302820]/70">
              The sunlit reading corner · Bentwood chairs and quiet pages
            </figcaption>
          </figure>
          <figure className="bg-white border border-[#302820]/10 overflow-hidden">
            <div className="aspect-[4/3] bg-[#EEE8DE]">
              <EditorialImage
                src="/src/assets/images/product_bakery_croissant_1795207095433.jpg"
                alt="Freshly laminated butter croissant and Swedish cardamom knot"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="p-4 text-xs text-[#302820]/70">
              Dawn bakehouse · Cultured butter viennoiserie &amp; cardamom knots
            </figcaption>
          </figure>
        </div>

        {/* Testimonials */}
        <div className="pt-12 border-t border-[#302820]/10">
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-6">
            Regulars &amp; Notes
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="bg-white border border-[#302820]/10 p-7 flex flex-col justify-between">
                <p className="text-sm text-[#302820]/85 leading-relaxed">“{t.quote}”</p>
                <footer className="mt-6 pt-4 border-t border-[#302820]/10">
                  <p className="font-serif text-base text-[#302820]">{t.name}</p>
                  <p className="text-xs text-[#302820]/60 mt-0.5">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Newsletter Journal Subscription */}
      <section className="bg-[#EEE8DE] border-t border-[#302820]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 text-center">
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
            The Sunday Journal
          </p>
          <h2 className="font-serif text-3xl text-[#302820]">
            Seasonal roasts, tasting notes, and quiet invitations.
          </h2>
          <p className="mt-3 text-sm text-[#302820]/75 max-w-lg mx-auto leading-relaxed">
            Receive a brief Sunday dispatch whenever a new micro-lot harvest arrives at the roastery or seasonal patisserie joins the counter.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="mt-7 max-w-md mx-auto flex flex-col sm:flex-row gap-3">
            <label htmlFor="home-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="home-newsletter-email"
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-4 py-3 bg-white border border-[#302820]/20 text-sm text-[#302820] placeholder:text-[#302820]/45 focus:outline-none focus:border-[#76563E]"
            />
            <button
              type="submit"
              disabled={newsletterStatus === 'loading'}
              className="px-6 py-3 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {newsletterStatus === 'loading' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>

          {newsletterFeedback && (
            <p
              className={`mt-4 text-sm inline-flex items-center gap-1.5 ${
                newsletterStatus === 'success' ? 'text-[#556149]' : 'text-[#9A3412]'
              }`}
              role="status"
            >
              {newsletterStatus === 'success' && <Check className="w-4 h-4" />}
              {newsletterFeedback}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
