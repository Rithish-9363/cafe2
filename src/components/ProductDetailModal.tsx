import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Product } from '../types';
import { EditorialImage } from './EditorialImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const isAvailable = product.availability === 1;

  const handleAdd = () => {
    if (!isAvailable) return;
    addToCart(product, quantity);
    setQuantity(1);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#302820]/55 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#F8F5EF] border border-[#302820]/15 max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#EEE8DE] aspect-[4/3] md:aspect-auto md:h-full">
          <EditorialImage src={product.image} alt={product.name} className="w-full h-full object-cover" eager />
        </div>

        <div className="p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="text-xs font-medium tracking-wider uppercase text-[#76563E]">
                {product.category} · {product.moodTag}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#302820]/60 hover:text-[#302820] hover:bg-[#EEE8DE] transition-colors cursor-pointer"
                aria-label="Close product details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 id="product-modal-title" className="font-serif text-2xl sm:text-3xl text-[#302820] leading-tight">
              {product.name}
            </h2>

            <p className="mt-3 text-xl font-medium text-[#302820] tabular-nums">
              ${product.price.toFixed(2)}
            </p>

            <p className="mt-4 text-sm text-[#302820]/80 leading-relaxed">{product.description}</p>

            {product.tastingNotes && (
              <div className="mt-5 pt-4 border-t border-[#302820]/10">
                <p className="text-xs uppercase tracking-wider text-[#302820]/55 mb-1">Tasting Notes</p>
                <p className="text-sm text-[#76563E]">{product.tastingNotes}</p>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-[#302820]/55 mb-1">Availability</p>
              <p className={`text-sm font-medium ${isAvailable ? 'text-[#556149]' : 'text-[#9A3412]'}`}>
                {isAvailable ? 'Prepared fresh to order · In Stock' : 'Currently Sold Out'}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-[#302820]/10 flex items-center gap-4">
            <div className="flex items-center border border-[#302820]/20 bg-[#F8F5EF]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!isAvailable}
                className="p-2.5 text-[#302820] hover:bg-[#EEE8DE] disabled:opacity-40 cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-medium tabular-nums text-[#302820]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                disabled={!isAvailable}
                className="p-2.5 text-[#302820] hover:bg-[#EEE8DE] disabled:opacity-40 cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={!isAvailable}
              onClick={handleAdd}
              className="flex-1 py-3 px-5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {isAvailable ? `Add to Bag · $${(product.price * quantity).toFixed(2)}` : 'Sold Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
