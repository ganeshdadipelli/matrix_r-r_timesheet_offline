'use client';
// app/(dashboard)/layout.tsx
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, ClipboardEdit, History, Users, ShieldCheck,
  Lightbulb, LogOut, Menu, X, Download, Shield,
} from 'lucide-react';

interface User {
  id: string; name: string; email: string; role: string;
  districtId?: string | null;
  district?: { id: string; name: string; code: string } | null;
}

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',   Icon: BarChart3,     roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/entry',         label: 'Data Entry',  Icon: ClipboardEdit, roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/entry/history', label: 'History',     Icon: History,       roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/data-tools',    label: 'Data Tools',  Icon: Download,      roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/admin',         label: 'Admin Panel', Icon: Users,         roles: ['ADMIN','SUPER_ADMIN'] },
  { href: '/insights',      label: 'ML Insights', Icon: Lightbulb,     roles: ['SUPER_ADMIN'] },
  { href: '/super-admin',   label: 'Audit Logs',  Icon: ShieldCheck,   roles: ['SUPER_ADMIN'] },
];

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'text-matrix-peach',  bg: 'bg-matrix-peach/15 border-matrix-peach/30' },
  ADMIN:       { label: 'Admin',       color: 'text-amber-400',     bg: 'bg-amber-900/30 border-amber-700/30' },
  FIELD_USER:  { label: 'Field User',  color: 'text-emerald-400',   bg: 'bg-emerald-900/30 border-emerald-700/30' },
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard Overview',
  '/entry':         'Data Entry',
  '/entry/history': 'Entry History',
  '/data-tools':    'Data Tools',
  '/admin':         'User Management',
  '/insights':      'ML Insights',
  '/super-admin':   'Audit Logs',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser]           = useState<User | null>(null);
  const [sidebarOpen, setSidebar] = useState(false);
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    const token   = localStorage.getItem('matrix_token');
    const userRaw = localStorage.getItem('matrix_user');
    if (!token || token === 'undefined' || token === 'null' || !userRaw || userRaw === 'undefined' || userRaw === 'null') {
      window.location.href = '/login'; return;
    }
    try {
      setUser(JSON.parse(userRaw) as User);
      setReady(true);
    } catch {
      localStorage.removeItem('matrix_token');
      localStorage.removeItem('matrix_user');
      window.location.href = '/login';
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('matrix_token');
    localStorage.removeItem('matrix_user');
    document.cookie = 'matrix_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login';
  }

  if (!ready) return (
    <div className="min-h-screen bg-matrix-dark flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 animate-morph-logo mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #5F6F7D, #D6A38A)' }}>
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-matrix-cloud/50 text-sm tracking-widest uppercase animate-pulse-soft">
          Loading…
        </p>
      </div>
    </div>
  );

  const nav = NAV.filter(n => user && n.roles.includes(user.role));
  const roleConf = user ? (ROLE_CONFIG[user.role] || ROLE_CONFIG.FIELD_USER) : ROLE_CONFIG.FIELD_USER;

  // Resolve current page title
  const currentTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || (path.length > 1 && pathname.startsWith(path + '/'))
  )?.[1] ?? 'Dashboard';

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #161E22 0%, #1A2428 100%)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link href="/dashboard" onClick={() => setSidebar(false)} className="flex items-center gap-3 group">
          <div className="w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #5F6F7D 0%, #D6A38A 100%)',
              borderRadius: '28% 72% 70% 30% / 30% 30% 70% 70%',
              animation: 'morphLogo 4s ease-in-out infinite',
            }}>
            <Shield className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <p className="font-display font-bold text-matrix-cream text-sm leading-none">Matrix Smart</p>
            <p className="text-matrix-peach/70 text-[10px] tracking-[0.18em] uppercase mt-0.5">Technologies</p>
          </div>
        </Link>
      </div>

      {/* User profile */}
      {user && (
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-matrix-deeper"
              style={{ background: 'linear-gradient(135deg, #D6A38A, #c4927a)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-matrix-cream text-sm font-medium truncate leading-tight">{user.name}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border uppercase tracking-wide mt-0.5 inline-block ${roleConf.bg} ${roleConf.color}`}>
                {roleConf.label}
              </span>
            </div>
          </div>
          {user.district && (
            <p className="text-matrix-cloud/40 text-xs mt-2 pl-12 truncate">{user.district.name} District</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, Icon }, idx) => {
          const active = pathname === href ||
            (href.length > 1 && href !== '/entry' && pathname.startsWith(href + '/'));
          return (
            <Link key={href} href={href} onClick={() => setSidebar(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                animate-slide-in-left group relative overflow-hidden
                ${active
                  ? 'text-matrix-cream'
                  : 'text-matrix-cloud/60 hover:text-matrix-cream hover:bg-white/[0.05]'
                }`}
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}>

              {/* Active indicator */}
              {active && (
                <div className="absolute inset-0 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(95,111,125,0.2) 0%, rgba(214,163,138,0.08) 100%)', border: '1px solid rgba(95,111,125,0.25)' }} />
              )}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #D6A38A, #5F6F7D)' }} />
              )}

              <Icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors ${active ? 'text-matrix-peach' : 'text-matrix-mist/60 group-hover:text-matrix-cloud'}`} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
                     text-matrix-cloud/40 hover:text-red-400 hover:bg-red-900/10 transition-all duration-200 group">
          <LogOut className="w-4 h-4 shrink-0 group-hover:rotate-12 transition-transform duration-200" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-matrix-dark">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 fixed inset-y-0 left-0 z-30 shadow-matrix-xl">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebar(false)} />
          <div className="relative w-64 z-50 shadow-matrix-xl animate-slide-in-left">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-20 px-4 lg:px-6 py-3 flex items-center gap-3"
          style={{
            background: 'rgba(31,42,46,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
          <button onClick={() => setSidebar(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-matrix-cloud/60 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <h1 className="font-display font-semibold text-matrix-cream text-base tracking-tight">
              {currentTitle}
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-right">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            <div>
              <p className="text-[10px] text-matrix-cloud/40 uppercase tracking-widest">Andhra Pradesh</p>
              <p className="text-xs font-semibold text-matrix-cloud/70">Camera Network</p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-matrix-deeper"
            style={{ background: 'linear-gradient(135deg, #D6A38A, #c4927a)' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>

        {/* Footer */}
        <footer className="px-6 py-3 text-center text-[11px] text-matrix-cloud/25 tracking-wide"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          © 2026 Matrix Smart Technologies · Offline Dependencies Field Intelligence System
        </footer>
      </div>
    </div>
  );
}
