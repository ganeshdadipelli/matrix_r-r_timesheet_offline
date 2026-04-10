'use client';
// app/(auth)/login/page.tsx
import { useState, FormEvent } from 'react';
import { Eye, EyeOff, BarChart3, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method:      'POST',
        credentials: 'include',          // browser stores the Set-Cookie the server sends
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Login failed.');
        setLoading(false); return;
      }

      // Save to localStorage so layout can show user info
      // DO NOT use document.cookie — server handles the auth cookie
      localStorage.setItem('matrix_token', data.data.token);
      localStorage.setItem('matrix_user',  JSON.stringify(data.data.user));

      window.location.href = '/dashboard';
    } catch {
      setError('Network error. Please try again.'); setLoading(false);
    }
  }

  const demos = [
    { label: 'Super Admin', email: 'superadmin@matrix.com', pass: 'Admin@123' },
    { label: 'Admin',       email: 'admin@matrix.com',      pass: 'Admin@123' },
    { label: 'Field User',  email: 'vizag@matrix.com',      pass: 'Field@123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-primary-700 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px,white 1px,transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-2xl mb-4">
            <BarChart3 className="w-9 h-9 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">Matrix Smart Technologies</h1>
          <p className="text-blue-200 text-sm mt-1">Offline Dependencies Dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="you@matrix.com" autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Login</p>
            <div className="space-y-1.5">
              {demos.map(d => (
                <button key={d.label}
                  onClick={() => { setEmail(d.email); setPassword(d.pass); setError(''); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">{d.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-blue-200 text-xs mt-5">© 2026 Matrix Smart Technologies</p>
      </div>
    </div>
  );
}