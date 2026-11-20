import React, { useEffect, useState } from 'react';
import { Check, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Order } from '../types';

export function AccountPage() {
  const { user, token, apiFetch, refreshUser, logout, navigate } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileFeedback, setProfileFeedback] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwFeedback, setPwFeedback] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;
    setOrdersLoading(true);
    apiFetch<{ orders: Order[] }>('/api/orders/mine')
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [apiFetch, token]);

  if (!user || !token) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-8 py-20 text-center">
        <div className="bg-white border border-[#302820]/10 p-10">
          <h1 className="font-serif text-3xl text-[#302820]">Account Access</h1>
          <p className="mt-2 text-sm text-[#302820]/70">
            Please sign in to view your personal profile and order history.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="px-6 py-3 border border-[#302820]/25 text-sm font-medium text-[#302820] hover:bg-[#EEE8DE] cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback('');
    setProfileError('');
    setSavingProfile(true);
    try {
      await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      await refreshUser();
      setProfileFeedback('Profile details updated.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback('');
    setPwError('');
    setSavingPw(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwFeedback(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="pb-8 border-b border-[#302820]/10 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
            Member Account
          </p>
          <h1 className="font-serif text-4xl text-[#302820]">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-[#302820]/65">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2.5 bg-[#76563E] text-white text-sm font-medium hover:bg-[#302820] transition-colors cursor-pointer"
            >
              Open Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#302820]/20 text-sm font-medium text-[#302820] hover:bg-[#EEE8DE] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Profile & Security */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white border border-[#302820]/10 p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-[#302820] mb-5">Personal Details</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="acc-name" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-1.5">
                  Full Name
                </label>
                <input
                  id="acc-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
                />
              </div>
              <div>
                <label htmlFor="acc-phone" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-1.5">
                  Phone Number
                </label>
                <input
                  id="acc-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
                />
              </div>
              {profileError && <p className="text-xs text-[#9A3412]">{profileError}</p>}
              {profileFeedback && (
                <p className="text-xs text-[#556149] inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {profileFeedback}
                </p>
              )}
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? 'Saving…' : 'Save Details'}
              </button>
            </form>
          </section>

          <section className="bg-white border border-[#302820]/10 p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-[#302820] mb-5">Update Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="cur-pw" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-1.5">
                  Current Password
                </label>
                <input
                  id="cur-pw"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
                />
              </div>
              <div>
                <label htmlFor="new-pw" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-1.5">
                  New Password (min 8 chars)
                </label>
                <input
                  id="new-pw"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
                />
              </div>
              {pwError && <p className="text-xs text-[#9A3412]">{pwError}</p>}
              {pwFeedback && <p className="text-xs text-[#556149]">{pwFeedback}</p>}
              <button
                type="submit"
                disabled={savingPw}
                className="px-5 py-2.5 border border-[#302820]/25 text-sm font-medium text-[#302820] hover:bg-[#EEE8DE] cursor-pointer"
              >
                {savingPw ? 'Updating…' : 'Change Password'}
              </button>
            </form>
          </section>
        </div>

        {/* Right: Order History */}
        <section className="lg:col-span-7 bg-white border border-[#302820]/10 p-6 sm:p-8">
          <h2 className="font-serif text-2xl text-[#302820] mb-6">My Order History</h2>

          {ordersLoading ? (
            <p className="text-sm text-[#302820]/60 py-8">Loading your orders…</p>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-[#302820]/15 bg-[#F8F5EF]/50 p-6">
              <p className="font-serif text-xl text-[#302820]">No orders placed yet</p>
              <p className="mt-1 text-sm text-[#302820]/65">
                Once you place an order while signed in, its live status and receipt will appear here.
              </p>
              <button
                type="button"
                onClick={() => navigate('/menu')}
                className="mt-5 px-5 py-2.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] cursor-pointer"
              >
                Explore Menu
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {orders.map((order) => (
                <article key={order.orderId} className="border border-[#302820]/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#302820]/10">
                    <div>
                      <p className="text-sm font-medium text-[#302820] tabular-nums">{order.orderId}</p>
                      <p className="text-xs text-[#302820]/60 mt-0.5">
                        {new Date(order.createdAt).toLocaleString()} · {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#76563E]">{order.orderStatus}</p>
                      <p className="text-xs text-[#302820]/60">{order.paymentStatus}</p>
                    </div>
                  </div>

                  <ul className="py-3 space-y-1.5 text-sm">
                    {order.items.map((item) => (
                      <li key={item.productId} className="flex justify-between text-[#302820]/85">
                        <span>
                          {item.quantity} &times; {item.name}
                        </span>
                        <span className="tabular-nums">${item.lineTotal.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-[#302820]/10 flex justify-between items-center text-sm font-medium text-[#302820]">
                    <span>Total Paid / Due</span>
                    <span className="tabular-nums">${order.total.toFixed(2)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
