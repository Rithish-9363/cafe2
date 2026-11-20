import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import type { Product } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { StoryPage } from './pages/StoryPage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage, SignUpPage } from './pages/AuthPages';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';

function BrewAndBlissShell() {
  const { route, toastMessage } = useApp();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5EF] text-[#302820]">
      <Navbar />

      <main className="flex-1">
        {route === '/' && <HomePage onSelectProduct={setSelectedProduct} />}
        {route === '/menu' && <MenuPage onSelectProduct={setSelectedProduct} />}
        {route === '/story' && <StoryPage />}
        {route === '/contact' && <ContactPage />}
        {route === '/cart' && <CartPage />}
        {route === '/checkout' && <CheckoutPage />}
        {route === '/login' && <LoginPage />}
        {route === '/signup' && <SignUpPage />}
        {route === '/account' && <AccountPage />}
        {route === '/admin' && <AdminPage />}
      </main>

      <Footer />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-[#302820] text-[#F8F5EF] px-5 py-3 text-sm shadow-lg border border-[#F8F5EF]/15"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrewAndBlissShell />
    </AppProvider>
  );
}
