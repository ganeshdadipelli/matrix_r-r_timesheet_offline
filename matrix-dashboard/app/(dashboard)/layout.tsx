'use client';
// app/(dashboard)/layout.tsx
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, ClipboardEdit, History, Users, ShieldCheck,
  Lightbulb, LogOut, Menu, X, Download,
} from 'lucide-react';

interface User {
  id: string; name: string; email: string; role: string;
  districtId?: string | null;
  district?: { id: string; name: string; code: string } | null;
}

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',   Icon: BarChart3,     roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/entry',        label: 'Data Entry',  Icon: ClipboardEdit, roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/entry/history',label: 'History',     Icon: History,       roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/data-tools',   label: 'Data Tools',  Icon: Download,      roles: ['FIELD_USER','ADMIN','SUPER_ADMIN'] },
  { href: '/admin',        label: 'Admin Panel', Icon: Users,         roles: ['ADMIN','SUPER_ADMIN'] },
  { href: '/insights', label: 'ML Insights', Icon: Lightbulb, roles: ['SUPER_ADMIN'] },
  { href: '/super-admin',  label: 'Super Admin', Icon: ShieldCheck,   roles: ['SUPER_ADMIN'] },
];

const ROLE_STYLE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-500 text-white',
  ADMIN:       'bg-amber-500 text-white',
  FIELD_USER:  'bg-emerald-500 text-white',
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
      window.location.href = '/login';
      return;
    }

    try {
      const parsed = JSON.parse(userRaw) as User;
      setUser(parsed);
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="w-8 h-8 text-primary-300 mx-auto mb-3 animate-pulse" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );

  const nav = NAV.filter(n => user && n.roles.includes(user.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-primary-900">
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Matrix Smart</p>
            <p className="text-blue-300 text-xs">Technologies</p>
          </div>
        </div>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLE[user.role] || 'bg-slate-500 text-white'}`}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
          {user.district && <p className="text-blue-300 text-xs mt-1.5 pl-12">{user.district.name}</p>}
        </div>
      )}

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href ||
            (href.length > 1 && href !== '/entry' && pathname.startsWith(href + '/'));
          return (
            <Link key={href} href={href} onClick={() => setSidebar(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="hidden lg:block w-60 shrink-0 fixed inset-y-0 left-0 z-30 shadow-xl">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebar(false)} />
          <div className="relative w-64 z-50 shadow-2xl"><SidebarContent /></div>
        </div>
      )}

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebar(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="flex-1 font-semibold text-slate-800 text-sm lg:text-base">
            {nav.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || 'Dashboard'}
          </h1>
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400">Andhra Pradesh</p>
            <p className="text-xs font-semibold text-slate-600">Camera Network</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{user?.name?.charAt(0)}</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>

        <footer className="border-t border-slate-200 bg-white px-6 py-2.5 text-center text-xs text-slate-400">
          © 2026 Matrix Smart Technologies · Offline Dependencies Field Data System
        </footer>
      </div>
    </div>
  );
}