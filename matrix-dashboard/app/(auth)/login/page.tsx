'use client';
// app/(auth)/login/page.tsx
import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid credentials. Please try again.');
        setLoading(false); return;
      }
      localStorage.setItem('matrix_token', data.data.token);
      localStorage.setItem('matrix_user',  JSON.stringify(data.data.user));
      window.location.href = '/dashboard';
    } catch {
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #161E22 0%, #1F2A2E 40%, #263035 70%, #1A2428 100%)' }}>

      {/* Ambient background orbs */}
      <div className="ambient-orb w-96 h-96 animate-ambient-float"
        style={{ top: '-10%', left: '-5%', background: 'radial-gradient(circle, rgba(95,111,125,0.18) 0%, transparent 70%)' }} />
      <div className="ambient-orb w-80 h-80 animate-ambient-float-2"
        style={{ bottom: '5%', right: '-5%', background: 'radial-gradient(circle, rgba(214,163,138,0.12) 0%, transparent 70%)' }} />
      <div className="ambient-orb w-64 h-64 animate-ambient-float-3"
        style={{ top: '40%', right: '20%', background: 'radial-gradient(circle, rgba(110,127,139,0.10) 0%, transparent 70%)' }} />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(237,234,230,1) 1px, transparent 1px), linear-gradient(90deg, rgba(237,234,230,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      {/* Horizon line */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(214,163,138,0.3), transparent)' }} />

      <div className={`relative w-full max-w-md px-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          {/* Animated logo mark */}
          <div className="inline-flex items-center justify-center mb-6 relative">
            <div className="w-16 h-16 animate-morph-logo flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #5F6F7D 0%, #D6A38A 100%)' }}>
              {/* Inner shield icon */}
              <Shield className="w-8 h-8 text-white relative z-10" />
            </div>
            {/* Outer ring pulse */}
            <div className="absolute w-20 h-20 rounded-full border border-matrix-peach/20 animate-ping"
              style={{ animationDuration: '3s' }} />
          </div>

          {/* Company name with Playfair Display */}
          <h1 className="font-display text-3xl font-bold text-matrix-cream tracking-tight leading-tight"
            style={{ animationDelay: '0.1s' }}>
            Matrix Smart
          </h1>
          <h2 className="font-display text-xl font-medium text-matrix-peach tracking-widest uppercase mt-0.5"
            style={{ letterSpacing: '0.2em' }}>
            Technologies
          </h2>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="h-px flex-1 max-w-12"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(214,163,138,0.4))' }} />
            <p className="text-matrix-cloud/60 text-xs font-medium uppercase tracking-widest">
              Field Intelligence Platform
            </p>
            <div className="h-px flex-1 max-w-12"
              style={{ background: 'linear-gradient(90deg, rgba(214,163,138,0.4), transparent)' }} />
          </div>
        </div>

        {/* Login card */}
        <div className="card-glass p-8 shadow-matrix-xl">
          <div className="mb-7">
            <h3 className="text-lg font-semibold text-matrix-cream">Welcome back</h3>
            <p className="text-sm text-matrix-cloud/60 mt-1">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg flex items-center gap-2.5 animate-fade-in"
              style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-matrix-cloud uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@matrix.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-matrix-cloud uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-matrix-cloud/50 hover:text-matrix-cloud transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{
                background: loading ? '#4e5d6a' : 'linear-gradient(135deg, #D6A38A 0%, #c4927a 100%)',
                color: '#1F2A2E',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(214,163,138,0.3)',
              }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Authenticating...</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-matrix-cloud/30 text-xs mt-6 tracking-wide">
          © 2026 Matrix Smart Technologies · Secure Access Portal
        </p>
      </div>
    </div>
  );
}
