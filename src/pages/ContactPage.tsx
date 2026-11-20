import React, { useState } from 'react';
import { Check, Clock, Mail, MapPin, Phone } from 'lucide-react';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setFeedback('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus('error');
        setFeedback(data.error || 'Could not send your message. Please check all fields.');
        return;
      }
      setStatus('success');
      setFeedback(data.message || 'Your message has been received.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setStatus('error');
      setFeedback('Network error while sending message. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="pb-8 border-b border-[#302820]/10 mb-12">
        <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
          Visit &amp; Inquiries
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#302820] tracking-tight">
          Contact Brew &amp; Bliss
        </h1>
        <p className="mt-3 text-base text-[#302820]/75 max-w-2xl leading-relaxed">
          Reserve a morning pastry box, inquire about private tastings, or reach our baristas directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Contact Info & Map Section */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white border border-[#302820]/10 p-7 space-y-6">
            <div className="flex items-start gap-3.5">
              <MapPin className="w-5 h-5 text-[#76563E] shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <h2 className="font-serif text-lg text-[#302820]">Café Address</h2>
                <p className="text-sm text-[#302820]/75 mt-1 leading-relaxed">
                  24 Rue des Rosiers, Willow Quarter
                  <br />
                  San Francisco, CA 94110
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-5 border-t border-[#302820]/10">
              <Clock className="w-5 h-5 text-[#76563E] shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <h2 className="font-serif text-lg text-[#302820]">Opening Hours</h2>
                <p className="text-sm text-[#302820]/75 mt-1 leading-relaxed tabular-nums">
                  Monday – Friday: 07:30 – 18:00
                  <br />
                  Saturday – Sunday: 08:30 – 19:00
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-5 border-t border-[#302820]/10">
              <Phone className="w-5 h-5 text-[#76563E] shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <h2 className="font-serif text-lg text-[#302820]">Telephone</h2>
                <p className="text-sm text-[#302820]/75 mt-1 tabular-nums">+1 (415) 555-0194</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-5 border-t border-[#302820]/10">
              <Mail className="w-5 h-5 text-[#76563E] shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <h2 className="font-serif text-lg text-[#302820]">Direct Email</h2>
                <p className="text-sm text-[#302820]/75 mt-1">hello@brewandbliss.cafe</p>
              </div>
            </div>
          </div>

          {/* Map Section — Real Google Maps Embed ONLY when configured */}
          <div className="bg-[#EEE8DE]/70 border border-[#302820]/10 overflow-hidden">
            {mapsKey ? (
              <iframe
                title="Brew & Bliss Location Map"
                className="w-full h-64 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsKey)}&q=24+Rue+des+Rosiers+San+Francisco`}
              />
            ) : (
              <div className="p-7">
                <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
                  Neighborhood Directions
                </p>
                <h3 className="font-serif text-xl text-[#302820]">Willow Quarter Flagship</h3>
                <p className="mt-2 text-sm text-[#302820]/75 leading-relaxed">
                  Located two blocks east of the Botanical Gardens, with cycle racks outside the courtyard and 15-minute pickup parking along Rosiers Lane.
                </p>
                <p className="mt-4 text-xs text-[#302820]/55">
                  Interactive map embed activates when <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> is configured.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-[#302820]/10 p-7 sm:p-10">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#302820] mb-2">Send us a note</h2>
            <p className="text-sm text-[#302820]/70 mb-8">
              Questions about wholesale beans, allergens, or catering? Write to us below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Clara Moreau"
                    className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    maxLength={160}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="clara@example.com"
                    className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  maxLength={120}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Private tasting inquiry or pastry pre-order"
                  className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share the details of your visit or inquiry…"
                  className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
                />
              </div>

              {feedback && (
                <div
                  role="status"
                  className={`p-4 text-sm border flex items-start gap-2.5 ${
                    status === 'success'
                      ? 'bg-[#89917D]/15 border-[#89917D]/40 text-[#302820]'
                      : 'bg-[#9A3412]/10 border-[#9A3412]/30 text-[#9A3412]'
                  }`}
                >
                  {status === 'success' && <Check className="w-4 h-4 text-[#556149] mt-0.5 shrink-0" />}
                  <span>{feedback}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-7 py-3.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {status === 'loading' ? 'Sending Message…' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
