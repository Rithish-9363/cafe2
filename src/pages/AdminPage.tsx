import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  CoffeeMood,
  ContactMessage,
  CustomerSummary,
  NewsletterSubscriber,
  Order,
  OrderStatus,
  Product,
  User,
} from '../types';
import { EditorialImage } from '../components/EditorialImage';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled',
];

const MOOD_OPTIONS: CoffeeMood[] = [
  'Fresh Start',
  'Strong Coffee',
  'Something Refreshing',
  'Sweet Craving',
];

type AdminTab = 'overview' | 'products' | 'orders' | 'customers' | 'messages';

interface OverviewData {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalRevenue: number;
  statusOverview: Array<{ orderStatus: string; count: number }>;
  recentOrders: Order[];
}

export function AdminPage() {
  const { user, token, setSession, logout, apiFetch, categories, reloadCatalog, showToast } = useApp();

  const [bootstrapStatus, setBootstrapStatus] = useState<{
    configured: boolean;
    source: 'env' | 'claimed' | 'unclaimed';
    defaultEmail: string;
  } | null>(null);

  const [authEmail, setAuthEmail] = useState('admin@brewandbliss.cafe');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('Café Director');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<{
    customer: CustomerSummary;
    orders: Order[];
  } | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);

  // Product Form Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('5.50');
  const [pCategory, setPCategory] = useState('Hot Coffee');
  const [pMood, setPMood] = useState<CoffeeMood>('Fresh Start');
  const [pNotes, setPNotes] = useState('');
  const [pImage, setPImage] = useState('/src/assets/images/product_hot_espresso_1795207094803.jpg');
  const [pAvailable, setPAvailable] = useState(true);
  const [pFeatured, setPFeatured] = useState(false);
  const [pUploading, setPUploading] = useState(false);
  const [pSaving, setPSaving] = useState(false);
  const [pError, setPError] = useState('');

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catError, setCatError] = useState('');

  useEffect(() => {
    fetch('/api/admin/bootstrap-status')
      .then((r) => r.json())
      .then((d: { configured: boolean; source: 'env' | 'claimed' | 'unclaimed'; defaultEmail: string }) => {
        setBootstrapStatus(d);
        if (d.defaultEmail) setAuthEmail(d.defaultEmail);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const [ov, prods, ords, custs, msgs, subs] = await Promise.all([
        apiFetch<OverviewData>('/api/admin/overview'),
        apiFetch<{ products: Product[] }>('/api/admin/products'),
        apiFetch<{ orders: Order[] }>('/api/admin/orders'),
        apiFetch<{ customers: CustomerSummary[] }>('/api/admin/customers'),
        apiFetch<{ messages: ContactMessage[] }>('/api/admin/messages'),
        apiFetch<{ subscribers: NewsletterSubscriber[] }>('/api/admin/subscribers'),
      ]);
      setOverview(ov);
      setAdminProducts(prods.products || []);
      setOrders(ords.orders || []);
      setCustomers(custs.customers || []);
      setMessages(msgs.messages || []);
      setSubscribers(subs.subscribers || []);
    } catch {
      // handled gracefully
    }
  }, [apiFetch, token, user?.role]);

  useEffect(() => {
    if (user?.role === 'admin' && token) {
      void loadAdminData();
    }
  }, [loadAdminData, token, user?.role]);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName.trim(),
          email: authEmail.trim(),
          password: authPassword,
        }),
      });
      const data = (await res.json()) as { token?: string; user?: User; error?: string };
      if (!res.ok || !data.token || !data.user) {
        setAuthError(data.error || 'Could not claim admin setup.');
        return;
      }
      setSession(data.token, data.user);
      setBootstrapStatus({ configured: true, source: 'claimed', defaultEmail: data.user.email });
      showToast('Admin portal claimed and unlocked.');
    } catch {
      setAuthError('Network error during admin setup.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
        }),
      });
      const data = (await res.json()) as { token?: string; user?: User; error?: string };
      if (!res.ok || !data.token || !data.user) {
        setAuthError(data.error || 'Invalid administrator credentials.');
        return;
      }
      setSession(data.token, data.user);
      showToast('Signed in to Admin Dashboard.');
    } catch {
      setAuthError('Network error during admin sign in.');
    } finally {
      setAuthLoading(false);
    }
  };

  const openNewProductForm = () => {
    setEditingProduct(null);
    setPName('');
    setPDesc('');
    setPPrice('5.50');
    setPCategory(categories[0]?.categoryName || 'Hot Coffee');
    setPMood('Fresh Start');
    setPNotes('');
    setPImage('/src/assets/images/product_hot_espresso_1795207094803.jpg');
    setPAvailable(true);
    setPFeatured(false);
    setPError('');
    setShowProductForm(true);
  };

  const openEditProductForm = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPDesc(prod.description);
    setPPrice(prod.price.toFixed(2));
    setPCategory(prod.category);
    setPMood(prod.moodTag);
    setPNotes(prod.tastingNotes || '');
    setPImage(prod.image);
    setPAvailable(prod.availability === 1);
    setPFeatured(prod.featured === 1);
    setPError('');
    setShowProductForm(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPError('');
    setPUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });
      const res = await apiFetch<{ url: string }>('/api/admin/upload', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      setPImage(res.url);
      showToast('Product image uploaded.');
    } catch (err) {
      setPError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setPUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setPError('');
    const numericPrice = Number(pPrice);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setPError('Please enter a valid positive price.');
      return;
    }
    setPSaving(true);
    try {
      const payload = {
        name: pName.trim(),
        description: pDesc.trim(),
        price: numericPrice,
        category: pCategory,
        moodTag: pMood,
        tastingNotes: pNotes.trim(),
        image: pImage.trim(),
        availability: pAvailable,
        featured: pFeatured,
      };
      if (editingProduct) {
        await apiFetch(`/api/admin/products/${editingProduct.productId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('Product updated.');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('New menu item added.');
      }
      setShowProductForm(false);
      await Promise.all([loadAdminData(), reloadCatalog()]);
    } catch (err) {
      setPError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setPSaving(false);
    }
  };

  const handleToggleAvailability = async (prod: Product) => {
    try {
      await apiFetch(`/api/admin/products/${prod.productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ availability: prod.availability !== 1 }),
      });
      await Promise.all([loadAdminData(), reloadCatalog()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await apiFetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      showToast('Product removed.');
      await Promise.all([loadAdminData(), reloadCatalog()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ categoryName: newCatName.trim(), description: newCatDesc.trim() }),
      });
      setNewCatName('');
      setNewCatDesc('');
      showToast('Category created.');
      await reloadCatalog();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Unable to create category.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setCatError('');
    try {
      await apiFetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
      showToast('Category removed.');
      await reloadCatalog();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Unable to delete category.');
    }
  };

  const handleOrderUpdate = async (orderId: string, orderStatus: string, paymentStatus: string) => {
    try {
      await apiFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ orderStatus, paymentStatus }),
      });
      showToast(`Order ${orderId} updated.`);
      await loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Order update failed.');
    }
  };

  const handleViewCustomerOrders = async (customer: CustomerSummary) => {
    try {
      const data = await apiFetch<{ orders: Order[] }>(`/api/admin/customers/${customer.userId}/orders`);
      setSelectedCustomerOrders({ customer, orders: data.orders || [] });
    } catch {
      showToast('Unable to load customer order history.');
    }
  };

  // Unauthenticated or non-admin view
  if (!user || user.role !== 'admin') {
    const isUnclaimed = bootstrapStatus?.source === 'unclaimed';

    return (
      <div className="max-w-lg mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="bg-white border border-[#302820]/10 p-8 sm:p-10">
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
            Restricted Staff Portal
          </p>
          <h1 className="font-serif text-3xl text-[#302820]">
            {isUnclaimed ? 'First-Run Admin Setup' : 'Admin Sign In'}
          </h1>
          <p className="mt-2 text-sm text-[#302820]/70 leading-relaxed">
            {isUnclaimed
              ? 'Claim the administrator account by setting an initial password below. This setup form locks permanently once completed (or when ADMIN_PASSCODE is configured in server environment secrets).'
              : 'Sign in with your administrator credentials to manage menu items, orders, customers, and café inquiries.'}
          </p>

          {user && user.role !== 'admin' && (
            <div className="mt-4 p-3.5 text-xs bg-[#EEE8DE] text-[#302820]">
              You are currently signed in as customer <span className="font-medium">{user.email}</span>. Sign in below with administrator credentials to switch to the Admin Portal.
            </div>
          )}

          <form onSubmit={isUnclaimed ? handleBootstrap : handleAdminLogin} className="mt-7 space-y-5">
            {isUnclaimed && (
              <div>
                <label htmlFor="adm-name" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                  Director Name
                </label>
                <input
                  id="adm-name"
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
                />
              </div>
            )}

            <div>
              <label htmlFor="adm-email" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                Admin Email
              </label>
              <input
                id="adm-email"
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
              />
            </div>

            <div>
              <label htmlFor="adm-pw" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
                {isUnclaimed ? 'Choose Admin Password (min 8 chars)' : 'Admin Password / Passcode'}
              </label>
              <input
                id="adm-pw"
                type="password"
                required
                minLength={isUnclaimed ? 8 : 1}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
              />
            </div>

            {authError && (
              <div className="p-3.5 text-sm bg-[#9A3412]/10 border border-[#9A3412]/30 text-[#9A3412]" role="alert">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {authLoading
                ? 'Verifying…'
                : isUnclaimed
                  ? 'Claim Admin Access'
                  : 'Enter Admin Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <div className="pb-6 border-b border-[#302820]/10 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-1.5">
            Brew &amp; Bliss Management
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#302820]">Café Admin Dashboard</h1>
          <p className="text-xs text-[#302820]/60 mt-1">Signed in as {user.email}</p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#302820]/20 text-sm font-medium text-[#302820] hover:bg-[#EEE8DE] cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 pb-6 border-b border-[#302820]/10 mb-8" role="tablist">
        {(
          [
            ['overview', 'Overview'],
            ['products', `Products & Categories (${adminProducts.length})`],
            ['orders', `Orders (${orders.length})`],
            ['customers', `Customers (${customers.length})`],
            ['messages', `Messages & Subscribers (${messages.length + subscribers.length})`],
          ] as Array<[AdminTab, string]>
        ).map(([tabId, label]) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={activeTab === tabId}
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tabId
                ? 'bg-[#302820] text-[#F8F5EF]'
                : 'bg-[#EEE8DE]/75 text-[#302820]/80 hover:bg-[#EEE8DE]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-[#302820]/10 p-6">
              <p className="text-xs uppercase tracking-wider text-[#302820]/60">Total Orders</p>
              <p className="font-serif text-3xl text-[#302820] mt-2 tabular-nums">{overview.totalOrders}</p>
            </div>
            <div className="bg-white border border-[#302820]/10 p-6">
              <p className="text-xs uppercase tracking-wider text-[#302820]/60">Menu Products</p>
              <p className="font-serif text-3xl text-[#302820] mt-2 tabular-nums">{overview.totalProducts}</p>
            </div>
            <div className="bg-white border border-[#302820]/10 p-6">
              <p className="text-xs uppercase tracking-wider text-[#302820]/60">Registered Customers</p>
              <p className="font-serif text-3xl text-[#302820] mt-2 tabular-nums">{overview.totalUsers}</p>
            </div>
            <div className="bg-white border border-[#302820]/10 p-6">
              <p className="text-xs uppercase tracking-wider text-[#302820]/60">Total Revenue</p>
              <p className="font-serif text-3xl text-[#302820] mt-2 tabular-nums">
                ${overview.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-white border border-[#302820]/10 p-6">
              <h2 className="font-serif text-xl text-[#302820] mb-4">Order Status Overview</h2>
              {overview.statusOverview.length === 0 ? (
                <p className="text-sm text-[#302820]/60">No orders placed yet.</p>
              ) : (
                <ul className="divide-y divide-[#302820]/10 text-sm">
                  {overview.statusOverview.map((s) => (
                    <li key={s.orderStatus} className="py-2.5 flex justify-between">
                      <span className="text-[#302820]/80">{s.orderStatus}</span>
                      <span className="font-medium text-[#302820] tabular-nums">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="lg:col-span-8 bg-white border border-[#302820]/10 p-6">
              <h2 className="font-serif text-xl text-[#302820] mb-4">Recent Orders</h2>
              {overview.recentOrders.length === 0 ? (
                <p className="text-sm text-[#302820]/60">Orders placed by guests or members will appear here.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#302820]/10 text-xs uppercase tracking-wider text-[#302820]/60">
                        <th className="py-2 pr-4">Order</th>
                        <th className="py-2 pr-4">Customer</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#302820]/10">
                      {overview.recentOrders.map((ord) => (
                        <tr key={ord.orderId}>
                          <td className="py-3 pr-4 tabular-nums font-medium">{ord.orderId}</td>
                          <td className="py-3 pr-4">{ord.customerName}</td>
                          <td className="py-3 pr-4 text-[#76563E]">{ord.orderStatus}</td>
                          <td className="py-3 text-right tabular-nums">${ord.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS & CATEGORIES */}
      {activeTab === 'products' && (
        <div className="space-y-12">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="font-serif text-2xl text-[#302820]">Menu Items</h2>
              <button
                type="button"
                onClick={openNewProductForm}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] cursor-pointer self-start"
              >
                <Plus className="w-4 h-4" /> Add Menu Item
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={handleSaveProduct} className="bg-white border border-[#302820]/20 p-6 sm:p-8 mb-8 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-[#302820]">
                    {editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Menu Item'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowProductForm(false)}
                    className="text-xs text-[#302820]/60 hover:text-[#302820] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#302820]/70 mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#302820]/70 mb-1.5">Category</label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm"
                    >
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryName}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#302820]/70 mb-1.5">Price ($)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.50"
                      required
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#302820]/70 mb-1.5">Coffee Mood Pairing</label>
                    <select
                      value={pMood}
                      onChange={(e) => setPMood(e.target.value as CoffeeMood)}
                      className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm"
                    >
                      {MOOD_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-[#302820]/70 mb-1.5">
                      Tasting Notes (separated by ·)
                    </label>
                    <input
                      type="text"
                      value={pNotes}
                      onChange={(e) => setPNotes(e.target.value)}
                      placeholder="Bergamot · Honey · Velvety Crema"
                      className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#302820]/70 mb-1.5">Description</label>
                  <textarea
                    required
                    rows={2}
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#302820]/70 mb-1.5">
                      Product Image URL or Upload
                    </label>
                    <input
                      type="text"
                      required
                      value={pImage}
                      onChange={(e) => setPImage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm"
                    />
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#302820]/20 bg-[#F8F5EF] text-xs font-medium text-[#302820] hover:bg-[#EEE8DE] cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {pUploading ? 'Uploading…' : 'Upload PNG / JPEG / WEBP'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm text-[#302820] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pAvailable}
                      onChange={(e) => setPAvailable(e.target.checked)}
                      className="accent-[#302820]"
                    />
                    Available for ordering
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-[#302820] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pFeatured}
                      onChange={(e) => setPFeatured(e.target.checked)}
                      className="accent-[#302820]"
                    />
                    Featured on Home page
                  </label>
                </div>

                {pError && <p className="text-sm text-[#9A3412]">{pError}</p>}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={pSaving || pUploading}
                    className="px-6 py-2.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 cursor-pointer"
                  >
                    {pSaving ? 'Saving…' : editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white border border-[#302820]/10 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#302820]/10 text-xs uppercase tracking-wider text-[#302820]/60">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Mood</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#302820]/10">
                  {adminProducts.map((prod) => (
                    <tr key={prod.productId}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 bg-[#EEE8DE] shrink-0 overflow-hidden">
                            <EditorialImage src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-[#302820]">{prod.name}</p>
                            {prod.featured === 1 && <p className="text-xs text-[#76563E]">Featured</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#302820]/80">{prod.category}</td>
                      <td className="py-3 px-4 text-[#302820]/70">{prod.moodTag}</td>
                      <td className="py-3 px-4 tabular-nums">${prod.price.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(prod)}
                          className={`px-2.5 py-1 text-xs font-medium border cursor-pointer ${
                            prod.availability === 1
                              ? 'border-[#556149]/40 text-[#556149] bg-[#89917D]/10'
                              : 'border-[#9A3412]/30 text-[#9A3412] bg-[#9A3412]/5'
                          }`}
                        >
                          {prod.availability === 1 ? 'In Stock' : 'Sold Out'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditProductForm(prod)}
                          className="p-1.5 text-[#302820]/70 hover:text-[#302820] cursor-pointer"
                          aria-label={`Edit ${prod.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.productId)}
                          className="p-1.5 text-[#302820]/50 hover:text-[#9A3412] cursor-pointer"
                          aria-label={`Delete ${prod.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Manager */}
          <div className="bg-white border border-[#302820]/10 p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-[#302820] mb-5">Menu Categories</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 divide-y divide-[#302820]/10">
                {categories.map((cat) => (
                  <div key={cat.categoryId} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm text-[#302820]">{cat.categoryName}</p>
                      <p className="text-xs text-[#302820]/65">{cat.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.categoryId)}
                      className="p-1.5 text-[#302820]/50 hover:text-[#9A3412] cursor-pointer"
                      aria-label={`Delete category ${cat.categoryName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCategory} className="lg:col-span-5 space-y-4 bg-[#F8F5EF] p-5 border border-[#302820]/10">
                <h3 className="font-serif text-lg text-[#302820]">Add Category</h3>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. Seasonal Roasts)"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#302820]/15 text-sm"
                />
                <input
                  type="text"
                  required
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short editorial description"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#302820]/15 text-sm"
                />
                {catError && <p className="text-xs text-[#9A3412]">{catError}</p>}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#302820] text-[#F8F5EF] text-xs font-medium hover:bg-[#76563E] cursor-pointer"
                >
                  Create Category
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          {orders.length === 0 ? (
            <div className="bg-white border border-[#302820]/10 p-10 text-center text-sm text-[#302820]/65">
              No orders have been submitted yet.
            </div>
          ) : (
            orders.map((ord) => (
              <article key={ord.orderId} className="bg-white border border-[#302820]/10 p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#302820]/10">
                  <div>
                    <p className="font-serif text-xl text-[#302820] tabular-nums">{ord.orderId}</p>
                    <p className="text-xs text-[#302820]/65 mt-0.5">
                      {new Date(ord.createdAt).toLocaleString()} · {ord.customerName} ({ord.phone})
                      {ord.customerEmail ? ` · ${ord.customerEmail}` : ''}
                    </p>
                    <p className="text-xs text-[#76563E] mt-1">
                      {ord.orderType === 'delivery' ? `Delivery to: ${ord.deliveryAddress}` : 'Counter Pickup'}
                      {ord.notes ? ` · Note: "${ord.notes}"` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#302820]/60 mb-1">
                        Order Status
                      </label>
                      <select
                        value={ord.orderStatus}
                        onChange={(e) => handleOrderUpdate(ord.orderId, e.target.value, ord.paymentStatus)}
                        className="px-3 py-1.5 bg-[#F8F5EF] border border-[#302820]/20 text-xs font-medium text-[#302820] cursor-pointer"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#302820]/60 mb-1">
                        Payment Status
                      </label>
                      <select
                        value={ord.paymentStatus}
                        onChange={(e) => handleOrderUpdate(ord.orderId, ord.orderStatus, e.target.value)}
                        className="px-3 py-1.5 bg-[#F8F5EF] border border-[#302820]/20 text-xs font-medium text-[#302820] cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Test Paid (Demo)">Test Paid (Demo)</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-sm">
                  <ul className="md:col-span-8 space-y-1">
                    {ord.items.map((it) => (
                      <li key={it.productId} className="flex justify-between text-[#302820]/85 max-w-md">
                        <span>
                          {it.quantity} &times; {it.name}
                        </span>
                        <span className="tabular-nums">${it.lineTotal.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="md:col-span-4 text-right space-y-1 text-xs text-[#302820]/70">
                    <p className="tabular-nums">Subtotal: ${ord.subtotal.toFixed(2)}</p>
                    <p className="tabular-nums">Tax: ${ord.tax.toFixed(2)} · Delivery: ${ord.deliveryFee.toFixed(2)}</p>
                    <p className="text-sm font-medium text-[#302820] tabular-nums pt-1">
                      Total: ${ord.total.toFixed(2)} ({ord.paymentMethod.replace(/_/g, ' ')})
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* TAB 4: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white border border-[#302820]/10 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#302820]/10 text-xs uppercase tracking-wider text-[#302820]/60">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Orders</th>
                  <th className="py-3 px-4 text-right">Spent</th>
                  <th className="py-3 px-4 text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#302820]/10">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#302820]/60">
                      No registered customers yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.userId}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#302820]">{c.name}</p>
                        <p className="text-xs text-[#302820]/60">{c.email}</p>
                      </td>
                      <td className="py-3 px-4 text-[#302820]/75 tabular-nums">{c.phone}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{c.orderCount}</td>
                      <td className="py-3 px-4 text-right tabular-nums">${Number(c.totalSpent).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewCustomerOrders(c)}
                          className="text-xs font-medium text-[#76563E] hover:underline cursor-pointer"
                        >
                          View Orders
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#302820]/10 p-6">
            <h2 className="font-serif text-xl text-[#302820] mb-4">Customer Order History</h2>
            {!selectedCustomerOrders ? (
              <p className="text-sm text-[#302820]/65">
                Select a customer from the table to inspect their past orders.
              </p>
            ) : selectedCustomerOrders.orders.length === 0 ? (
              <p className="text-sm text-[#302820]/65">
                {selectedCustomerOrders.customer.name} has not placed any orders yet.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-[#76563E]">
                  {selectedCustomerOrders.customer.name} ({selectedCustomerOrders.orders.length} orders)
                </p>
                {selectedCustomerOrders.orders.map((o) => (
                  <div key={o.orderId} className="p-3.5 bg-[#F8F5EF] border border-[#302820]/10 text-xs space-y-1">
                    <div className="flex justify-between font-medium text-[#302820]">
                      <span className="tabular-nums">{o.orderId}</span>
                      <span className="tabular-nums">${o.total.toFixed(2)}</span>
                    </div>
                    <p className="text-[#302820]/70">
                      {o.orderStatus} · {o.paymentStatus} · {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MESSAGES & SUBSCRIBERS */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-7 bg-white border border-[#302820]/10 p-6">
            <h2 className="font-serif text-2xl text-[#302820] mb-5">Contact Form Submissions</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-[#302820]/60">No contact inquiries received yet.</p>
            ) : (
              <div className="divide-y divide-[#302820]/10">
                {messages.map((m) => (
                  <article key={m.messageId} className="py-4">
                    <div className="flex justify-between gap-2">
                      <h3 className="font-medium text-sm text-[#302820]">{m.subject}</h3>
                      <span className="text-xs text-[#302820]/55 tabular-nums">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#76563E] mt-0.5">
                      {m.name} · {m.email}
                    </p>
                    <p className="text-sm text-[#302820]/80 mt-2 leading-relaxed">{m.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="lg:col-span-5 bg-white border border-[#302820]/10 p-6">
            <h2 className="font-serif text-2xl text-[#302820] mb-5">Sunday Journal Subscribers</h2>
            {subscribers.length === 0 ? (
              <p className="text-sm text-[#302820]/60">No newsletter subscribers yet.</p>
            ) : (
              <ul className="divide-y divide-[#302820]/10 text-sm">
                {subscribers.map((s) => (
                  <li key={s.subscriberId} className="py-3 flex justify-between gap-3">
                    <span className="text-[#302820] truncate">{s.email}</span>
                    <span className="text-xs text-[#302820]/55 tabular-nums shrink-0">
                      {new Date(s.subscribedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
