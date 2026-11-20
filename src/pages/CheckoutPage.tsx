import React, { useEffect, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Order, PaymentMethod } from '../types';

export function CheckoutPage() {
  const { cart, cartSubtotal, user, apiFetch, clearCart, navigate } = useApp();

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pay_at_pickup');
  const [notes, setNotes] = useState('');

  const [paymentConfig, setPaymentConfig] = useState<{ stripeConfigured: boolean; mode: 'stripe' | 'demo' }>({
    stripeConfigured: false,
    mode: 'demo',
  });
  const [demoAuthorized, setDemoAuthorized] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name);
      setCustomerEmail((prev) => prev || user.email);
      setPhone((prev) => prev || user.phone);
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/payments/config')
      .then((r) => r.json())
      .then((d: { stripeConfigured?: boolean; mode?: 'stripe' | 'demo' }) => {
        setPaymentConfig({
          stripeConfigured: Boolean(d.stripeConfigured),
          mode: d.mode === 'stripe' ? 'stripe' : 'demo',
        });
      })
      .catch(() => {
        // default demo mode
      });
  }, []);

  // Keep payment method compatible when switching pickup <-> delivery
  const handleOrderTypeChange = (nextType: 'pickup' | 'delivery') => {
    setOrderType(nextType);
    setDemoAuthorized(false);
    setDemoToken(null);
    if (nextType === 'pickup' && paymentMethod === 'cash_on_delivery') {
      setPaymentMethod('pay_at_pickup');
    } else if (nextType === 'delivery' && paymentMethod === 'pay_at_pickup') {
      setPaymentMethod('cash_on_delivery');
    }
  };

  const tax = Math.round(cartSubtotal * 0.08 * 100) / 100;
  const deliveryFee = orderType === 'delivery' ? (cartSubtotal >= 35 ? 0 : 4.5) : 0;
  const total = Math.round((cartSubtotal + tax + deliveryFee) * 100) / 100;

  const handleAuthorizeDemoPayment = async () => {
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ demoPaymentToken: string }>('/api/payments/demo-confirm', {
        method: 'POST',
        body: JSON.stringify({
          orderType,
          items: cart.map((c) => ({ productId: c.product.productId, quantity: c.quantity })),
        }),
      });
      setDemoToken(data.demoPaymentToken);
      setDemoAuthorized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authorize test payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError('Your bag is empty.');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setError('Please enter your delivery address.');
      return;
    }
    if (paymentMethod === 'online_card') {
      if (paymentConfig.stripeConfigured) {
        setError('Stripe Elements live card collection requires VITE_STRIPE_PUBLISHABLE_KEY integration on checkout. Please choose Pay at Pickup or Cash on Delivery, or run in Demo mode.');
        return;
      }
      if (!demoAuthorized || !demoToken) {
        setError('Please authorize the Test / Demo Online Payment step before placing your order.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const data = await apiFetch<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          phone: phone.trim(),
          orderType,
          deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : '',
          paymentMethod,
          paymentToken: paymentMethod === 'online_card' ? demoToken : undefined,
          notes: notes.trim(),
          items: cart.map((c) => ({ productId: c.product.productId, quantity: c.quantity })),
        }),
      });
      setConfirmedOrder(data.order);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
        <div className="bg-white border border-[#302820]/15 p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[#556149] mb-4">
            <Check className="w-4 h-4" /> Order Confirmed
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#302820]">
            Thank you, {confirmedOrder.customerName}.
          </h1>
          <p className="mt-2 text-sm text-[#302820]/75">
            Your order <span className="font-medium text-[#302820] tabular-nums">{confirmedOrder.orderId}</span> has been received and queued for preparation.
          </p>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-y border-[#302820]/10 text-sm">
            <div>
              <p className="text-xs text-[#302820]/55">Order Status</p>
              <p className="font-medium text-[#302820] mt-1">{confirmedOrder.orderStatus}</p>
            </div>
            <div>
              <p className="text-xs text-[#302820]/55">Fulfillment</p>
              <p className="font-medium text-[#302820] mt-1 capitalize">{confirmedOrder.orderType}</p>
            </div>
            <div>
              <p className="text-xs text-[#302820]/55">Payment Status</p>
              <p className="font-medium text-[#302820] mt-1">{confirmedOrder.paymentStatus}</p>
            </div>
            <div>
              <p className="text-xs text-[#302820]/55">Total</p>
              <p className="font-medium text-[#302820] mt-1 tabular-nums">
                ${confirmedOrder.total.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[#76563E] mb-3">
              Items Ordered
            </h2>
            <ul className="divide-y divide-[#302820]/10 text-sm">
              {confirmedOrder.items.map((item) => (
                <li key={item.productId} className="py-2.5 flex justify-between">
                  <span className="text-[#302820]">
                    {item.quantity} &times; {item.name}
                  </span>
                  <span className="font-medium text-[#302820] tabular-nums">
                    ${item.lineTotal.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 pt-4 border-t border-[#302820]/10 space-y-1.5 text-sm">
              <div className="flex justify-between text-[#302820]/70">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">${confirmedOrder.subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-[#302820]/70">
                <dt>Tax (8%)</dt>
                <dd className="tabular-nums">${confirmedOrder.tax.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-[#302820]/70">
                <dt>Delivery Fee</dt>
                <dd className="tabular-nums">${confirmedOrder.deliveryFee.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between font-medium text-[#302820] pt-2 border-t border-[#302820]/10">
                <dt>Total Charged / Due</dt>
                <dd className="tabular-nums">${confirmedOrder.total.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {user && (
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="px-6 py-3 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] transition-colors cursor-pointer"
              >
                View My Orders
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/menu')}
              className="px-6 py-3 border border-[#302820]/25 text-sm font-medium text-[#302820] hover:bg-[#EEE8DE] transition-colors cursor-pointer"
            >
              Return to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16 text-center">
        <h1 className="font-serif text-3xl text-[#302820]">No items to check out</h1>
        <p className="mt-2 text-sm text-[#302820]/70">Add drinks or pastries from our menu before proceeding to checkout.</p>
        <button
          type="button"
          onClick={() => navigate('/menu')}
          className="mt-6 px-6 py-3 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] transition-colors cursor-pointer"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="pb-8 border-b border-[#302820]/10 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
            Checkout
          </p>
          <h1 className="font-serif text-4xl text-[#302820]">Complete Your Order</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/cart')}
          className="text-sm font-medium text-[#76563E] hover:text-[#302820] cursor-pointer"
        >
          &larr; Back to Bag
        </button>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-8">
          {/* Customer Details */}
          <section className="bg-white border border-[#302820]/10 p-6 sm:p-8 space-y-5">
            <h2 className="font-serif text-2xl text-[#302820]">1. Customer Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="chk-name" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                  Full Name
                </label>
                <input
                  id="chk-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
                />
              </div>
              <div>
                <label htmlFor="chk-phone" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                  Phone Number
                </label>
                <input
                  id="chk-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (415) 555-0148"
                  className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="chk-email" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                Email (for receipt)
              </label>
              <input
                id="chk-email"
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
              />
            </div>
          </section>

          {/* Fulfillment */}
          <section className="bg-white border border-[#302820]/10 p-6 sm:p-8 space-y-5">
            <h2 className="font-serif text-2xl text-[#302820]">2. Pickup or Local Delivery</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleOrderTypeChange('pickup')}
                className={`p-4 text-left border transition-colors cursor-pointer ${
                  orderType === 'pickup'
                    ? 'bg-[#302820] text-[#F8F5EF] border-[#302820]'
                    : 'bg-[#F8F5EF] text-[#302820] border-[#302820]/15 hover:border-[#76563E]'
                }`}
              >
                <p className="font-serif text-lg">Café Pickup</p>
                <p className={`text-xs mt-1 ${orderType === 'pickup' ? 'text-[#EEE8DE]/80' : 'text-[#302820]/65'}`}>
                  Ready at counter in 15 mins · $0.00
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleOrderTypeChange('delivery')}
                className={`p-4 text-left border transition-colors cursor-pointer ${
                  orderType === 'delivery'
                    ? 'bg-[#302820] text-[#F8F5EF] border-[#302820]'
                    : 'bg-[#F8F5EF] text-[#302820] border-[#302820]/15 hover:border-[#76563E]'
                }`}
              >
                <p className="font-serif text-lg">Local Delivery</p>
                <p className={`text-xs mt-1 ${orderType === 'delivery' ? 'text-[#EEE8DE]/80' : 'text-[#302820]/65'}`}>
                  {cartSubtotal >= 35 ? 'Complimentary ($35+ order)' : '$4.50 flat fee (Free $35+)'}
                </p>
              </button>
            </div>

            {orderType === 'delivery' && (
              <div>
                <label htmlFor="chk-address" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                  Delivery Street Address
                </label>
                <input
                  id="chk-address"
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="142 Willow Street, Apt 4B"
                  className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
                />
              </div>
            )}

            <div>
              <label htmlFor="chk-notes" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                Barista Notes (optional)
              </label>
              <input
                id="chk-notes"
                type="text"
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Extra hot, oat milk preference, ring bell…"
                className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
              />
            </div>
          </section>

          {/* Payment Selection */}
          <section className="bg-white border border-[#302820]/10 p-6 sm:p-8 space-y-5">
            <h2 className="font-serif text-2xl text-[#302820]">3. Payment Method</h2>

            <div className="space-y-3">
              {orderType === 'pickup' && (
                <label className="flex items-start gap-3 p-4 border border-[#302820]/15 bg-[#F8F5EF]/60 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'pay_at_pickup'}
                    onChange={() => setPaymentMethod('pay_at_pickup')}
                    className="mt-1 accent-[#302820]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#302820]">Pay at Pickup</p>
                    <p className="text-xs text-[#302820]/65 mt-0.5">
                      Settle at the espresso counter when collecting your order.
                    </p>
                  </div>
                </label>
              )}

              {orderType === 'delivery' && (
                <label className="flex items-start gap-3 p-4 border border-[#302820]/15 bg-[#F8F5EF]/60 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                    className="mt-1 accent-[#302820]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#302820]">Cash on Delivery</p>
                    <p className="text-xs text-[#302820]/65 mt-0.5">
                      Pay our courier upon arrival at your doorstep.
                    </p>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-3 p-4 border border-[#302820]/15 bg-[#F8F5EF]/60 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'online_card'}
                  onChange={() => setPaymentMethod('online_card')}
                  className="mt-1 accent-[#302820]"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#302820]">
                    Online Payment ({paymentConfig.stripeConfigured ? 'Stripe Test Mode' : 'Test / Demo Checkout'})
                  </p>
                  <p className="text-xs text-[#302820]/65 mt-0.5">
                    {paymentConfig.stripeConfigured
                      ? 'Verified server-side via Stripe PaymentIntent.'
                      : 'Stripe API credentials are not configured yet. Use server-verified Test/Demo payment authorization without entering sensitive card data.'}
                  </p>
                </div>
              </label>
            </div>

            {paymentMethod === 'online_card' && !paymentConfig.stripeConfigured && (
              <div className="p-5 bg-[#EEE8DE]/70 border border-[#76563E]/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#76563E]">
                  <ShieldCheck className="w-4 h-4" /> Test / Demo Payment Mode
                </div>
                <p className="text-xs text-[#302820]/75 leading-relaxed">
                  No card numbers or CVVs are collected or stored. Authorizing below requests a signed one-time test token from the server and marks your order as <span className="font-medium">Test Paid (Demo)</span>. To activate live Stripe payments, set <code className="font-mono">STRIPE_SECRET_KEY</code> and <code className="font-mono">VITE_STRIPE_PUBLISHABLE_KEY</code> in environment secrets.
                </p>
                <button
                  type="button"
                  disabled={demoAuthorized || submitting}
                  onClick={handleAuthorizeDemoPayment}
                  className={`px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                    demoAuthorized
                      ? 'bg-[#556149] text-white'
                      : 'bg-[#76563E] text-white hover:bg-[#302820]'
                  }`}
                >
                  {demoAuthorized ? 'Test Payment Verified on Server' : `Authorize Test Payment ($${total.toFixed(2)})`}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Order Summary Right Column */}
        <aside className="lg:col-span-5 bg-white border border-[#302820]/10 p-6 sm:p-8 sticky top-24">
          <h2 className="font-serif text-2xl text-[#302820] mb-5">Order Summary</h2>

          <ul className="divide-y divide-[#302820]/10 border-b border-[#302820]/10 pb-4 mb-5 max-h-72 overflow-y-auto">
            {cart.map(({ product, quantity }) => (
              <li key={product.productId} className="py-3 flex justify-between gap-4 text-sm">
                <span className="text-[#302820]">
                  {quantity} &times; {product.name}
                </span>
                <span className="font-medium text-[#302820] tabular-nums shrink-0">
                  ${(product.price * quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2.5 text-sm border-b border-[#302820]/10 pb-5">
            <div className="flex justify-between">
              <dt className="text-[#302820]/70">Subtotal</dt>
              <dd className="tabular-nums text-[#302820]">${cartSubtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#302820]/70">Tax (8%)</dt>
              <dd className="tabular-nums text-[#302820]">${tax.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#302820]/70">Delivery Fee</dt>
              <dd className="tabular-nums text-[#302820]">${deliveryFee.toFixed(2)}</dd>
            </div>
          </dl>

          <div className="flex justify-between items-baseline py-5">
            <span className="font-serif text-lg text-[#302820]">Total</span>
            <span className="font-serif text-2xl text-[#302820] tabular-nums">${total.toFixed(2)}</span>
          </div>

          {error && (
            <div className="mb-4 p-3.5 text-sm bg-[#9A3412]/10 border border-[#9A3412]/30 text-[#9A3412]" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Confirming Order…' : `Place Order · $${total.toFixed(2)}`}
          </button>
        </aside>
      </form>
    </div>
  );
}
