import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { User } from '../types';

export function LoginPage() {
  const { setSession, navigate, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNotice, setForgotNotice] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { token?: string; user?: User; error?: string };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error || 'Invalid email or password.');
        return;
      }
      setSession(data.token, data.user);
      showToast(`Welcome back, ${data.user.name}.`);
      navigate(data.user.role === 'admin' ? '/admin' : '/account');
    } catch {
      setError('Network error while signing in.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotNotice('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      setForgotNotice(data.message || data.error || 'Request noted.');
    } catch {
      setForgotNotice('Unable to send password reset request.');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-8 py-16 sm:py-24">
      <div className="bg-white border border-[#302820]/10 p-8 sm:p-10">
        <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
          Guest &amp; Member Access
        </p>
        <h1 className="font-serif text-3xl text-[#302820]">Sign In</h1>
        <p className="mt-2 text-sm text-[#302820]/70">
          Access your saved bag, profile details, and order history.
        </p>

        <form onSubmit={handleLogin} className="mt-7 space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgot((s) => !s)}
                className="text-xs text-[#76563E] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
            />
          </div>

          {error && (
            <div className="p-3.5 text-sm bg-[#9A3412]/10 border border-[#9A3412]/30 text-[#9A3412]" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        {showForgot && (
          <form onSubmit={handleForgot} className="mt-6 pt-6 border-t border-[#302820]/10 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#302820]/70">
              Password Reset
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your account email"
                className="flex-1 px-3 py-2.5 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#76563E] text-white text-xs font-medium hover:bg-[#302820] cursor-pointer"
              >
                Request
              </button>
            </div>
            {forgotNotice && <p className="text-xs text-[#302820]/75 leading-relaxed">{forgotNotice}</p>}
          </form>
        )}

        <div className="mt-7 pt-6 border-t border-[#302820]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="text-[#76563E] hover:text-[#302820] font-medium cursor-pointer text-left"
          >
            New to Brew &amp; Bliss? Create account &rarr;
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="text-xs text-[#302820]/60 hover:text-[#302820] cursor-pointer text-left"
          >
            Staff Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignUpPage() {
  const { setSession, navigate, showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });
      const data = (await res.json()) as { token?: string; user?: User; error?: string };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error || 'Could not create your account.');
        return;
      }
      setSession(data.token, data.user);
      showToast(`Welcome to Brew & Bliss, ${data.user.name}.`);
      navigate('/account');
    } catch {
      setError('Network error while creating account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-8 py-16 sm:py-24">
      <div className="bg-white border border-[#302820]/10 p-8 sm:p-10">
        <p className="text-xs font-medium tracking-wider uppercase text-[#76563E] mb-2">
          Join the Café
        </p>
        <h1 className="font-serif text-3xl text-[#302820]">Create Account</h1>
        <p className="mt-2 text-sm text-[#302820]/70">
          Save your favorites, speed through morning pickup, and track your orders.
        </p>

        <form onSubmit={handleRegister} className="mt-7 space-y-5">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              maxLength={160}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
            />
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
              Phone Number
            </label>
            <input
              id="reg-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (415) 555-0192"
              className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-medium uppercase tracking-wider text-[#302820]/70 mb-2">
              Password (minimum 8 characters)
            </label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8F5EF] border border-[#302820]/15 text-sm text-[#302820] focus:outline-none focus:border-[#76563E]"
            />
          </div>

          {error && (
            <div className="p-3.5 text-sm bg-[#9A3412]/10 border border-[#9A3412]/30 text-[#9A3412]" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#302820] text-[#F8F5EF] text-sm font-medium hover:bg-[#76563E] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="mt-7 pt-6 border-t border-[#302820]/10 text-sm">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[#76563E] hover:text-[#302820] font-medium cursor-pointer"
          >
            Already have an account? Sign in &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
