import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CoffeeMood, MoodGroup, Product } from '../types';
import { EditorialImage } from './EditorialImage';

const MOOD_ORDER: CoffeeMood[] = [
  'Fresh Start',
  'Strong Coffee',
  'Something Refreshing',
  'Sweet Craving',
];

export function CoffeeMoodSection({ onSelectProduct }: { onSelectProduct: (p: Product) => void }) {
  const { addToCart, navigate } = useApp();
  const [moods, setMoods] = useState<MoodGroup[]>([]);
  const [activeMood, setActiveMood] = useState<CoffeeMood>('Fresh Start');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/moods')
      .then((r) => r.json())
      .then((data: { moods?: MoodGroup[] }) => {
        if (active && Array.isArray(data.moods)) {
          setMoods(data.moods);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentGroup = moods.find((m) => m.mood === activeMood);

  return (
    <section className="py-16 sm:py-20 bg-[#EEE8DE]/60 border-y border-[#302820]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
              The Coffee Mood
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#302820] tracking-tight">
              What are you in the mood for today?
            </h2>
          </div>
          <p className="text-sm text-[#302820]/75 max-w-md leading-relaxed">
            Choose the tempo of your morning or afternoon, and our cellar pairs live selections straight from today&apos;s bar.
          </p>
        </div>

        {/* 4 Mood Interactive Selector Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10" role="tablist" aria-label="Coffee Mood Selector">
          {MOOD_ORDER.map((moodName, index) => {
            const isActive = activeMood === moodName;
            return (
              <button
                key={moodName}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveMood(moodName)}
                className={`text-left px-5 py-4 border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#302820] text-[#F8F5EF] border-[#302820]'
                    : 'bg-white text-[#302820] border-[#302820]/12 hover:border-[#76563E]/50'
                }`}
              >
                <span className={`block text-xs tabular-nums mb-1 ${isActive ? 'text-[#EEE8DE]/70' : 'text-[#76563E]'}`}>
                  0{index + 1}
                </span>
                <span className="font-serif text-lg block leading-snug">{moodName}</span>
              </button>
            );
          })}
        </div>

        {/* Mood Curated Output */}
        {loading ? (
          <div className="py-12 text-center text-sm text-[#302820]/60">Curating today&apos;s pairings…</div>
        ) : currentGroup ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#302820]/10">
              <div>
                <p className="font-serif text-xl text-[#302820]">{currentGroup.subtitle}</p>
                <p className="text-sm text-[#302820]/70 mt-1">{currentGroup.ritualNote}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/menu')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#76563E] hover:text-[#302820] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Browse full menu <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {currentGroup.recommendations.length === 0 ? (
              <p className="text-sm text-[#302820]/70 py-6">
                All pairings for this mood are resting today. Explore another mood or visit our full menu.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {currentGroup.recommendations.map((product) => (
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
                      <div className="p-5">
                        <p className="text-xs text-[#76563E] mb-1.5">
                          {product.category}
                          {product.tastingNotes ? ` · ${product.tastingNotes.split('·')[0].trim()}` : ''}
                        </p>
                        <h3 className="font-serif text-lg text-[#302820] leading-snug mb-2">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product)}
                            className="text-left hover:text-[#76563E] transition-colors cursor-pointer"
                          >
                            {product.name}
                          </button>
                        </h3>
                        <p className="text-sm text-[#302820]/70 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-[#302820]/5">
                      <span className="text-base font-medium text-[#302820] tabular-nums">
                        ${product.price.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(product, 1)}
                        className="px-3.5 py-2 text-xs font-medium bg-[#76563E] text-white hover:bg-[#302820] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Add to Bag
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
