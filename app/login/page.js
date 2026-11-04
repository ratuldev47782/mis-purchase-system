// app/login/page.js

'use client';

import { useState } from 'react';
import { api } from '@/lib/client';

const input =
  'w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 outline-none transition ' +
  'hover:border-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30';

const Icon = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-amber-600"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await api('/api/login', { method: 'POST', body: { username: username.trim(), password } });
      // full reload so the sidebar / app shell picks up the new session
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4">
      {/* Soft background accents */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-slate-300/60 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 md:grid-cols-2">
        <div className="absolute inset-x-0 top-0 z-10 h-1 bg-amber-400" />

        {/* Illustration */}
        <div className="hidden flex-col items-center justify-center gap-6 bg-gradient-to-br from-amber-50 to-amber-100/60 p-8 md:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mobile-login-animate.svg" alt="Person logging in on a mobile device" className="w-full max-w-sm" />
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col justify-center">
          {/* Brand header */}
          <div className="flex items-center justify-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/HKD_LOGO.png" alt="HKD logo" className="h-12 w-12 shrink-0 object-contain" />
            <span className="h-10 w-px bg-slate-300" />
            <div className="flex flex-col items-start">
              <h1 className="m-0 text-sm font-bold tracking-[0.18em] text-slate-800 sm:text-base">
                HKD OUTDOOR INNOVATIONS LTD
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-600">
                MIS Purchase Billing ERP
              </span>
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to continue to your dashboard.</p>
            </div>

            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-slate-600">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  required
                  autoFocus
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`peer ${input}`}
                />
                <Icon>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                </Icon>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-600">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`peer ${input} pr-14`}
                />
                <Icon>
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </Icon>
                {/* bg-transparent / hover:bg-transparent override the global blue button style */}
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 rounded-r-lg bg-transparent px-3 py-0 text-xs font-medium text-slate-500 outline-none hover:bg-transparent hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-amber-400/60"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div aria-live="polite">
              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:bg-amber-500 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}