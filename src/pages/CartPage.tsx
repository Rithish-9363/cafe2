import { Minus, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EditorialImage } from '../components/EditorialImage';

export function CartPage() {
  const { cart, cartSubtotal, updateCartQuantity, removeFromCart, navigate } = useApp();

  const estimatedTax = Math.round(cartSubtotal * 0.08 * 100) / 100;
  const estimatedTotal = Math.round((cartSubtotal + estimatedTax) * 100) / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="pb-8 border-b border-[#302820]/10 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
            Order Bag
          </p>
          <h1 className="font-serif text-4xl text-[#302820] tracking-tight">Your Selection</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/menu')}
          className="text-sm font-medium text-[#76563E] hover:text-[#302820] transition-colors cursor-pointer"
        >
          &larr; Continue Shopping
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white border border-[#302820]/10 p-12 text-center">
          <h2 className="font-serif text-2xl text-[#302820]">Your bag is currently empty</h2>
          <p className="mt-2 text-sm text-[#302820]/70 max-w-md mx-auto">
            Explore our espresso bar, cold infusions, ceremonial teas, and freshly laminated pastries.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/menu')}
              className="px-6 py-3 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] transition-colors cursor-pointer"
            >
              Explore Menu
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-8 bg-white border border-[#302820]/10 divide-y divide-[#302820]/10">
            {cart.map(({ product, quantity }) => (
              <div key={product.productId} className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="w-24 h-20 bg-[#EEE8DE] shrink-0 overflow-hidden">
                  <EditorialImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#76563E] mb-0.5">{product.category}</p>
                  <h2 className="font-serif text-lg text-[#302820] truncate">{product.name}</h2>
                  <p className="text-sm text-[#302820]/65 tabular-nums mt-0.5">
                    ${product.price.toFixed(2)} each
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                  <div className="flex items-center border border-[#302820]/15 bg-[#F8F5EF]">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(product.productId, quantity - 1)}
                      className="p-2 text-[#302820] hover:bg-[#EEE8DE] cursor-pointer"
                      aria-label={`Decrease quantity of ${product.name}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3.5 text-sm font-medium tabular-nums text-[#302820]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(product.productId, quantity + 1)}
                      className="p-2 text-[#302820] hover:bg-[#EEE8DE] cursor-pointer"
                      aria-label={`Increase quantity of ${product.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-base font-medium text-[#302820] tabular-nums w-16 text-right">
                    ${(product.price * quantity).toFixed(2)}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeFromCart(product.productId)}
                    className="p-2 text-[#302820]/50 hover:text-[#9A3412] transition-colors cursor-pointer"
                    aria-label={`Remove ${product.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Card */}
          <aside className="lg:col-span-4 bg-white border border-[#302820]/10 p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-[#302820] mb-6">Order Summary</h2>

            <dl className="space-y-3 text-sm border-b border-[#302820]/10 pb-5">
              <div className="flex justify-between">
                <dt className="text-[#302820]/70">Subtotal</dt>
                <dd className="font-medium text-[#302820] tabular-nums">${cartSubtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#302820]/70">Estimated Tax (8%)</dt>
                <dd className="font-medium text-[#302820] tabular-nums">${estimatedTax.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#302820]/70">Delivery / Pickup</dt>
                <dd className="text-[#302820]/70 text-right">
                  {cartSubtotal >= 35 ? 'Free pickup or delivery' : '$0 pickup · $4.50 delivery'}
                </dd>
              </div>
            </dl>

            <div className="flex justify-between items-baseline py-5">
              <span className="font-serif text-lg text-[#302820]">Estimated Total</span>
              <span className="font-serif text-2xl text-[#302820] tabular-nums">
                ${estimatedTotal.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-[#302820]/60 mb-6 leading-relaxed">
              Final taxes and delivery charges are verified securely on the server during checkout. Complimentary local delivery on orders of $35.00 or more.
            </p>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] transition-colors cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
