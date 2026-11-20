import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Product } from '../types';
import { EditorialImage } from '../components/EditorialImage';

export function MenuPage({ onSelectProduct }: { onSelectProduct: (p: Product) => void }) {
  const { categories, products, catalogLoading, addToCart } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'name_asc'>('featured');

  const categoryTabs = useMemo(
    () => ['All', ...categories.map((c) => c.categoryName)],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (q) {
        const match =
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tastingNotes.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return (b.featured || 0) - (a.featured || 0);
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="pb-8 border-b border-[#302820]/10 mb-8">
        <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
          Daily Counter &amp; Bakehouse
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#302820] tracking-tight">
          The Brew &amp; Bliss Menu
        </h1>
        <p className="mt-3 text-base text-[#302820]/75 max-w-2xl leading-relaxed">
          Every espresso, hand-poured filter, ceremonial matcha, and flaky pastry is prepared fresh to order. Click any item for tasting notes or add directly to your bag.
        </p>
      </div>

      {/* Category Filter Tabs + Search + Price Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Menu categories">
          {categoryTabs.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#302820] text-[#F8F5EF]'
                    : 'bg-[#EEE8DE]/75 text-[#302820]/80 hover:bg-[#EEE8DE] hover:text-[#302820]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#302820]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drinks, pastries, notes…"
              aria-label="Search menu"
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-[#302820]/15 text-sm text-[#302820] placeholder:text-[#302820]/45 focus:outline-none focus:border-[#76563E]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort menu"
            className="px-3.5 py-2.5 bg-white border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E] cursor-pointer"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
          </select>
        </div>
      </div>

      {/* Menu Grid */}
      {catalogLoading ? (
        <div className="py-20 text-center text-sm text-[#302820]/60">Loading today&apos;s menu…</div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center bg-white border border-[#302820]/10 p-10">
          <p className="font-serif text-2xl text-[#302820]">No menu items match your filter</p>
          <p className="mt-2 text-sm text-[#302820]/65">
            Try clearing your search or switching back to all categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="mt-5 px-5 py-2.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => {
            const available = product.availability === 1;
            return (
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
                      className={`w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03] ${
                        !available ? 'opacity-60 grayscale-[35%]' : ''
                      }`}
                    />
                  </button>
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="text-[#76563E]">
                        {product.category} · {product.moodTag}
                      </span>
                      <span className={available ? 'text-[#556149]' : 'text-[#9A3412]'}>
                        {available ? 'In Stock' : 'Sold Out'}
                      </span>
                    </div>
                    <h2 className="font-serif text-xl text-[#302820] leading-snug">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="text-left hover:text-[#76563E] transition-colors cursor-pointer"
                      >
                        {product.name}
                      </button>
                    </h2>
                    <p className="mt-2.5 text-sm text-[#302820]/70 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 flex items-center justify-between gap-4 border-t border-[#302820]/5">
                  <span className="text-base font-medium text-[#302820] tabular-nums">
                    ${product.price.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="px-3 py-2 text-xs font-medium text-[#302820]/75 hover:text-[#302820] border border-[#302820]/15 transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => addToCart(product, 1)}
                      className="px-4 py-2 text-xs font-medium bg-[#302820] text-[#F8F5EF] hover:bg-[#76563E] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {available ? 'Add to Bag' : 'Unavailable'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
