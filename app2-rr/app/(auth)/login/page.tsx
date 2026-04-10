'use client';

import { FormEvent, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('rr_token', data.data.token);
      localStorage.setItem('rr_user', JSON.stringify(data.data.user));
      window.location.href = '/team';
    } catch {
      setError('Unable to connect to server');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 p-10">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold">DC Team R&amp;R</p>
              <p className="text-sm text-slate-300">Matrix Smart Technologies</p>
            </div>
          </div>

          <div className="mt-12 max-w-xl">
            <h1 className="text-4xl font-extrabold leading-tight">
              Unified Governance, Timesheet Execution &amp; AI-Powered ML Insights
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Centralized role allocation, daily timesheet reporting, and predictive machine learning models to accelerate Data Center leadership decisions.
            </p>
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            Authorized access only
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter your authorized account credentials.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field pl-9"
                    placeholder="Enter your email"
                    type="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pl-9 pr-10"
                    placeholder="Enter your password"
                    type={show ? 'text' : 'password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(prev => !prev)}
                    className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-700"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}