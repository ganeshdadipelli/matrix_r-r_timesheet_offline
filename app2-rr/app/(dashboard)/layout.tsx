'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  GitBranch,
  LogOut,
  Menu,
  Settings2,
  Shield,
  Users,
  X,
  Clock4,
  BrainCircuit,
  TableProperties,
  BarChart3,
  ClipboardEdit,
  History as HistoryIcon,
  Download,
} from 'lucide-react';
import { clearSession, getSessionToken, getSessionUser, type SessionUser } from '@/lib/utils/session';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { href: '/dashboard', label: 'Platform Overview', icon: FileText },
    { href: '/team', label: 'Organization Map', icon: GitBranch },
    { href: '/admin', label: 'Access Control', icon: Users },
    { href: '/timesheet', label: 'Log Daily Works', icon: Clock4 },
    { href: '/timesheet-summary', label: 'Work Execution Reports', icon: TableProperties },
    { href: '/insights', label: 'ML Insights', icon: BrainCircuit },
    { href: '/rr', label: 'Role Matrix', icon: Settings2 },
  ],
  SUPER_BOSS: [
    { href: '/dashboard', label: 'Platform Overview', icon: FileText },
    { href: '/team', label: 'Organization Map', icon: GitBranch },
    { href: '/admin', label: 'Access Control', icon: Users },
    { href: '/timesheet', label: 'Log Daily Works', icon: Clock4 },
    { href: '/timesheet-summary', label: 'Work Execution Reports', icon: TableProperties },
    { href: '/insights', label: 'ML Insights', icon: BrainCircuit },
    { href: '/rr', label: 'Role Matrix', icon: Settings2 },
  ],
  MANAGER: [
    { href: '/dashboard', label: 'Platform Overview', icon: FileText },
    { href: '/team', label: 'Organization Map', icon: GitBranch },
    { href: '/admin', label: 'Access Control', icon: Users },
    { href: '/timesheet', label: 'Log Daily Works', icon: Clock4 },
    { href: '/timesheet-summary', label: 'Work Execution Reports', icon: TableProperties },
    { href: '/insights', label: 'ML Insights', icon: BrainCircuit },
    { href: '/rr', label: 'Role Matrix', icon: Settings2 },
  ],
  TEAM_LEAD: [
    { href: '/dashboard', label: 'Platform Overview', icon: FileText },
    { href: '/team', label: 'Organization Map', icon: GitBranch },
    { href: '/admin', label: 'Access Control', icon: Users },
    { href: '/timesheet', label: 'Log Daily Works', icon: Clock4 },
    { href: '/timesheet-summary', label: 'Work Execution Reports', icon: TableProperties },
    { href: '/insights', label: 'ML Insights', icon: BrainCircuit },
    { href: '/rr', label: 'Role Matrix', icon: Settings2 },
  ],
  TEAM_MEMBER: [
    { href: '/dashboard', label: 'Platform Overview', icon: FileText },
    { href: '/team', label: 'Organization Map', icon: GitBranch },
    { href: '/timesheet', label: 'Log Daily Works', icon: Clock4 },
    { href: '/timesheet-summary', label: 'Work Execution Reports', icon: TableProperties },
    { href: '/insights', label: 'Self Diagnostics', icon: BrainCircuit },
    { href: '/rr', label: 'Role Matrix', icon: Settings2 },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'System Admin',
  SUPER_BOSS: 'DC Head',
  MANAGER: 'Manager',
  TEAM_MEMBER: 'Team Member',
};

const ROLE_BADGES: Record<string, string> = {
  SUPER_ADMIN: 'pill-head',
  SUPER_BOSS: 'pill-head',
  MANAGER: 'pill-manager',
  TEAM_MEMBER: 'pill-member',
};

function Avatar({ user }: { user: SessionUser | null }) {
  if (user?.photoUrl) {
    return (
      <img
        src={user.photoUrl}
        alt={user.name}
        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/20"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 text-lg font-bold text-white">
      {user?.name?.charAt(0) || 'U'}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getSessionToken();
    const sessionUser = getSessionUser();

    if (!token || !sessionUser) {
      // Also clear cookies to avoid middleware loop
      document.cookie = 'rr_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      // Use replace to prevent back-button loops
      window.location.replace('/login');
      return;
    }

    setUser(sessionUser);
    setReady(true);
  }, []);

  const nav = useMemo(() => {
    return NAV_BY_ROLE[user?.role || 'TEAM_MEMBER'] || NAV_BY_ROLE.TEAM_MEMBER;
  }, [user]);

  function logout() {
    clearSession();
    document.cookie = 'rr_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    fetch('/api/v1/auth/logout', { method: 'POST' }).finally(() => {
      window.location.href = '/login';
    });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111823]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 shadow-glow">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-white">Matrix Smart</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400 font-bold mb-1">Governance</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {nav.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 ${
                active
                  ? 'bg-gradient-to-r from-primary-600/20 to-transparent text-primary-400 shadow-[inset_2px_0_0_0_rgba(59,130,246,0.8)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 transition-transform ${active ? 'scale-110' : ''}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
           <div className="flex items-center gap-3">
             <Avatar user={user} />
             <div className="min-w-0 flex-1">
               <p className="truncate text-sm font-bold text-white">{user?.name}</p>
               <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase text-slate-400 font-bold">
                 {ROLE_LABELS[user?.role || 'TEAM_MEMBER']}
               </span>
             </div>
           </div>
           
           <button
             onClick={logout}
             className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/20"
           >
             <LogOut className="h-3.5 w-3.5" /> Sign Out
           </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#020617] p-2 sm:p-4 gap-4 font-sans text-slate-100 overflow-hidden">
      
      {/* Premium Floating Island Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-[280px] xl:w-[300px] shrink-0 rounded-[2rem] bg-[#0b111a] border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-primary-600/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2" />
        <Sidebar />
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col rounded-[2rem] bg-[#0b111a] border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-600/5 blur-[120px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />
        
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#0b111a]/80 px-4 py-4 backdrop-blur-xl">
           <div className="flex items-center gap-3">
             <Shield className="h-8 w-8 text-primary-500" />
             <p className="text-lg font-black tracking-tight text-white">Matrix Smart</p>
           </div>
           <button
             onClick={() => setOpen(true)}
             className="rounded-xl bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
           >
             <Menu className="h-6 w-6" />
           </button>
        </header>

        {/* Mobile Dropdown Menu Overlay */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[280px] bg-[#0b111a] shadow-2xl animate-in slide-in-from-left-8 duration-300">
               <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 rounded-full"><X className="h-5 w-5"/></button>
               <Sidebar />
            </div>
          </div>
        )}

        {/* Scrollable Content Expanse */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 relative z-10 custom-scrollbar">
           {children}
        </div>
      </main>
    </div>
  );
}