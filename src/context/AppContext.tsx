import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Category, PageRoute, Product, User } from '../types';

const GUEST_CART_KEY = 'brew_bliss_guest_cart_v1';

const VALID_ROUTES: PageRoute[] = [
  '/',
  '/menu',
  '/story',
  '/contact',
  '/cart',
  '/checkout',
  '/login',
  '/signup',
  '/account',
  '/admin',
];

function normalizeRoute(pathname: string): PageRoute {
  if (VALID_ROUTES.includes(pathname as PageRoute)) {
    return pathname as PageRoute;
  }
  return '/';
}

interface AppContextValue {
  route: PageRoute;
  navigate: (to: PageRoute) => void;
  user: User | null;
  token: string | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  categories: Category[];
  products: Product[];
  catalogLoading: boolean;
  reloadCatalog: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<PageRoute>(() => normalizeRoute(window.location.pathname));
  // Auth token stored strictly in React memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage failure
    }
    return [];
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: PageRoute) => {
    setRoute(to);
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const apiFetch = useCallback(
    async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [token]
  );

  const reloadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [catData, prodData] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()) as Promise<{ categories: Category[] }>,
        fetch('/api/products?includeUnavailable=true').then((r) => r.json()) as Promise<{ products: Product[] }>,
      ]);
      setCategories(catData.categories || []);
      setProducts(prodData.products || []);
    } catch {
      // ignore transient error
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  // Persist guest cart in localStorage when logged out, or sync with server when logged in
  useEffect(() => {
    if (!token) {
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [cart, token]);

  const syncServerCart = useCallback(
    async (nextCart: CartItem[], authToken: string) => {
      try {
        await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            items: nextCart.map((c) => ({ productId: c.product.productId, quantity: c.quantity })),
          }),
        });
      } catch {
        // non-blocking sync
      }
    },
    []
  );

  const setSession = useCallback(
    (newToken: string, newUser: User) => {
      setToken(newToken);
      setUser(newUser);
      // Merge local guest cart with server cart if customer
      void (async () => {
        try {
          const res = await fetch('/api/cart', {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (!res.ok) return;
          const data = (await res.json()) as { items: Array<Product & { quantity: number }> };
          const serverItems: CartItem[] = (data.items || []).map(({ quantity, ...product }) => ({
            product,
            quantity,
          }));
          setCart((prev) => {
            if (prev.length === 0) return serverItems;
            const mergedMap = new Map<string, CartItem>();
            for (const item of serverItems) mergedMap.set(item.product.productId, item);
            for (const item of prev) {
              const existing = mergedMap.get(item.product.productId);
              if (existing) {
                mergedMap.set(item.product.productId, {
                  product: item.product,
                  quantity: Math.min(50, existing.quantity + item.quantity),
                });
              } else {
                mergedMap.set(item.product.productId, item);
              }
            }
            const merged = Array.from(mergedMap.values());
            void syncServerCart(merged, newToken);
            return merged;
          });
        } catch {
          // ignore
        }
      })();
    },
    [syncServerCart]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    showToast('You have been signed out.');
    navigate('/');
  }, [navigate, showToast]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<{ user: User }>('/api/auth/me');
    setUser(data.user);
  }, [apiFetch, token]);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (product.availability !== 1) {
        showToast(`${product.name} is currently unavailable.`);
        return;
      }
      setCart((prev) => {
        const idx = prev.findIndex((i) => i.product.productId === product.productId);
        let next: CartItem[];
        if (idx >= 0) {
          next = prev.map((item, i) =>
            i === idx ? { ...item, quantity: Math.min(50, item.quantity + quantity) } : item
          );
        } else {
          next = [...prev, { product, quantity: Math.min(50, Math.max(1, quantity)) }];
        }
        if (token) void syncServerCart(next, token);
        return next;
      });
      showToast(`Added ${product.name} to your bag.`);
    },
    [showToast, syncServerCart, token]
  );

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      setCart((prev) => {
        const next =
          quantity <= 0
            ? prev.filter((item) => item.product.productId !== productId)
            : prev.map((item) =>
                item.product.productId === productId
                  ? { ...item, quantity: Math.min(50, Math.floor(quantity)) }
                  : item
              );
        if (token) void syncServerCart(next, token);
        return next;
      });
    },
    [syncServerCart, token]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setCart((prev) => {
        const next = prev.filter((item) => item.product.productId !== productId);
        if (token) void syncServerCart(next, token);
        return next;
      });
    },
    [syncServerCart, token]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(GUEST_CART_KEY);
    } catch {
      // ignore
    }
    if (token) void syncServerCart([], token);
  }, [syncServerCart, token]);

  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => Math.round(cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0) * 100) / 100,
    [cart]
  );

  const value: AppContextValue = {
    route,
    navigate,
    user,
    token,
    setSession,
    logout,
    refreshUser,
    apiFetch,
    categories,
    products,
    catalogLoading,
    reloadCatalog,
    cart,
    cartCount,
    cartSubtotal,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toastMessage,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
