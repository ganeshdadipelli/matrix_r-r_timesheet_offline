'use client';
// app/(dashboard)/dashboard/page.tsx
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw, Download, ChevronDown, ChevronRight,
  Wifi, WifiOff, Monitor, MapPin, TrendingDown,
} from 'lucide-react';

interface Entry {
  id: string; date: string;
  district: { id: string; name: string; code: string; sortOrder: number };
  totalCount: number; onlineCount: number; offlineCount: number;
  onlinePct: number; offlinePct: number;
  cat6Cable: number; threeCorepower: number; gponIssues: number; ofcIssues: number;
  cameraStoreReplacement: number; camerasFluctuating: number; needToCheck: number;
  fiberRequired: number; hydraLadder: number; mcbIssue: number; switch8portIssue: number;
  roadExtensionConstruction: number; noOlt: number; popDown: number; jbAccident: number;
  renovation: number; powerDisconnection: number; dgpOffice: number; needPeerIp: number;
  internalSum: number; externalSum: number;
}

const INT_DEPS = [
  ['CAT6 Cable', 'cat6Cable'], ['3-Core Power', 'threeCorepower'],
  ['GPON Issues', 'gponIssues'], ['OFC Issues', 'ofcIssues'],
  ['Cam Store/Repl', 'cameraStoreReplacement'], ['Cam Fluctuating', 'camerasFluctuating'],
  ['Need to Check', 'needToCheck'], ['Fiber Required', 'fiberRequired'],
  ['Hydra Ladder', 'hydraLadder'], ['MCB Issue', 'mcbIssue'], ['8-Port Switch', 'switch8portIssue'],
] as const;

const EXT_DEPS = [
  ['Road Extension', 'roadExtensionConstruction'], ['No OLT', 'noOlt'],
  ['Pop Down', 'popDown'], ['JB Accident', 'jbAccident'],
  ['Renovation', 'renovation'], ['Power Disc.', 'powerDisconnection'],
  ['DGP Office', 'dgpOffice'], ['Need Peer IP', 'needPeerIp'],
] as const;

function offlineSeverity(pct: number) {
  if (pct < 10) return { bar: '#10B981', badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40', track: '#065F46' };
  if (pct < 15) return { bar: '#F59E0B', badge: 'bg-amber-900/50 text-amber-300 border-amber-700/40',   track: '#78350F' };
  if (pct < 20) return { bar: '#F97316', badge: 'bg-orange-900/50 text-orange-300 border-orange-700/40', track: '#7C2D12' };
  return           { bar: '#EF4444', badge: 'bg-red-900/50 text-red-300 border-red-700/40',           track: '#7F1D1D' };
}

function StatCard({ label, value, sub, icon: Icon, accentColor, delay = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accentColor: string; delay?: number;
}) {
  return (
    <div className="stat-card animate-fade-in-up" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      {/* Background accent glow */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-4 translate-x-4"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }} />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest">{label}</p>
          <p className="text-3xl font-bold mt-1.5 text-matrix-cream font-mono">{value}</p>
          {sub && <p className="text-xs text-matrix-cloud/40 mt-1 font-medium">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-glass px-4 py-3 shadow-matrix-lg text-sm">
      <p className="text-matrix-cloud/60 text-xs mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'table' | 'charts'>('table');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`/api/v1/entries?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setEntries([...data.data].sort((a, b) => a.district.sortOrder - b.district.sortOrder));
      }
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totals = entries.reduce((a, e) => ({
    total:   a.total   + e.totalCount,
    online:  a.online  + e.onlineCount,
    offline: a.offline + e.offlineCount,
  }), { total: 0, online: 0, offline: 0 });

  const grandOnlinePct  = totals.total ? (totals.online  / totals.total * 100) : 0;
  const grandOfflinePct = totals.total ? (totals.offline / totals.total * 100) : 0;
  const internalTotal   = entries.reduce((s, e) => s + e.internalSum, 0);
  const externalTotal   = entries.reduce((s, e) => s + e.externalSum, 0);

  const barData    = entries.map(e => ({ name: e.district.code, offline: e.offlineCount, online: e.onlineCount }));
  const pieData    = [{ name:'Internal', value: internalTotal }, { name:'External', value: externalTotal }].filter(d=>d.value>0);
  const PIE_COLORS = ['#D6A38A', '#5F6F7D'];

  async function downloadExcel() {
    try {
      const params = new URLSearchParams({ from: date, to: date, format: 'xlsx' });
      const res = await apiFetch(`/api/v1/entries/download?${params.toString()}`);
      if (!res.ok) { const d = await res.json().catch(()=>null); alert(d?.error||'Download failed'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `offline-dependencies-${date}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed. Please try again.'); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Offline Dependencies</h2>
          <p className="section-subtitle">Andhra Pradesh Camera Network · 13 Districts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={date} max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => setDate(e.target.value)} className="input-field w-auto text-sm" />
          <button onClick={load}
            className="btn-secondary p-2" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={downloadExcel} disabled={!entries.length}
            className="btn-primary py-2 px-3 flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <Link href="/data-tools"
            className="btn-secondary py-2 px-3 flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Bulk Tools
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cameras"      value={totals.total.toLocaleString()}  icon={Monitor} accentColor="#7C8A96" delay={0} />
        <StatCard label="Online"             value={totals.online.toLocaleString()} icon={Wifi}    accentColor="#10B981" delay={80}
          sub={`${grandOnlinePct.toFixed(1)}% operational`} />
        <StatCard label="Offline"            value={totals.offline.toLocaleString()} icon={WifiOff} accentColor="#EF4444" delay={160}
          sub={`${grandOfflinePct.toFixed(1)}% offline`} />
        <StatCard label="Districts Reported" value={`${entries.length} / 13`}        icon={MapPin}  accentColor="#D6A38A" delay={240} />
      </div>

      {/* Tab switcher */}
      <div className="tab-bar">
        {(['table','charts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`tab-item capitalize ${tab===t ? 'tab-item-active' : ''}`}>
            {t === 'table' ? 'District Table' : 'Analytics Charts'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-16 flex flex-col items-center gap-4">
          <RefreshCw className="w-7 h-7 text-matrix-slate animate-spin" />
          <p className="text-matrix-cloud/40 text-sm">Fetching field data…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-16 text-center">
          <WifiOff className="w-14 h-14 text-matrix-border mx-auto mb-4" />
          <p className="text-matrix-cloud/60 font-semibold">No data for {date}</p>
          <p className="text-matrix-cloud/30 text-sm mt-1">Field team hasn't submitted entries yet.</p>
        </div>
      ) : tab === 'table' ? (

        /* ── TABLE VIEW ── */
        <div className="card overflow-hidden animate-fade-in">
          {/* Table header */}
          <div className="px-4 py-2.5 grid grid-cols-12 gap-2 border-b border-matrix-border"
            style={{ background: 'rgba(22,30,34,0.8)' }}>
            {[['#','col-span-1'],['District','col-span-3'],['Total','col-span-2 text-center'],
              ['Online','col-span-2 text-center'],['Offline','col-span-2 text-center'],
              ['%','col-span-1 text-center'],['','col-span-1']
            ].map(([label, cls]) => (
              <div key={label} className={`${cls} text-[10px] font-semibold text-matrix-cloud/40 uppercase tracking-widest`}>
                {label}
              </div>
            ))}
          </div>

          <div className="divide-y divide-matrix-border/40">
            {entries.map((e, i) => {
              const sev   = offlineSeverity(e.offlinePct);
              const isOpen = expanded.has(e.id);
              const intDeps = INT_DEPS.filter(([, k]) => (e as any)[k] > 0);
              const extDeps = EXT_DEPS.filter(([, k]) => (e as any)[k] > 0);

              return (
                <div key={e.id} className={`transition-colors duration-100 ${isOpen ? 'bg-white/[0.02]' : 'hover:bg-white/[0.025]'}`}>
                  <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-[10px] text-matrix-cloud/25 font-mono">{i+1}</div>

                    <div className="col-span-3">
                      <p className="font-semibold text-sm text-matrix-cream truncate">{e.district.name}</p>
                      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: sev.track + '40' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${e.offlinePct}%`, background: sev.bar }} />
                      </div>
                    </div>

                    <div className="col-span-2 text-center font-mono text-sm text-matrix-cloud/70 font-medium">
                      {e.totalCount.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-center font-mono text-sm text-emerald-400 font-medium">
                      {e.onlineCount.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-center font-mono text-sm text-red-400 font-bold">
                      {e.offlineCount.toLocaleString()}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold border ${sev.badge}`}>
                        {e.offlinePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => toggleExpand(e.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-matrix-cloud/40 hover:text-matrix-cloud transition-all">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-matrix-border/30 animate-fade-in">
                      {/* Summary bar */}
                      <div className="flex flex-wrap items-center gap-4 text-xs px-3 py-2.5 rounded-lg"
                        style={{ background: 'rgba(22,30,34,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-matrix-cloud/50">Online:</span>
                          <strong className="text-emerald-400 font-mono">{e.onlineCount.toLocaleString()} ({e.onlinePct.toFixed(1)}%)</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-matrix-cloud/50">Offline:</span>
                          <strong className="text-red-400 font-mono">{e.offlineCount.toLocaleString()} ({e.offlinePct.toFixed(1)}%)</strong>
                        </span>
                        <span className="ml-auto flex items-center gap-1.5">
                          <span className="text-matrix-cloud/50">Internal:</span>
                          <strong className="text-matrix-peach font-mono">{e.internalSum}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-matrix-cloud/50">External:</span>
                          <strong className="text-matrix-slate font-mono">{e.externalSum}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Internal deps */}
                        <div className="rounded-lg p-3"
                          style={{ background: 'rgba(214,163,138,0.06)', border: '1px solid rgba(214,163,138,0.15)' }}>
                          <p className="text-[10px] font-bold text-matrix-peach/70 uppercase tracking-widest mb-2.5">
                            Internal Dependencies ({e.internalSum})
                          </p>
                          {intDeps.length === 0 ? (
                            <p className="text-xs text-matrix-cloud/30">No internal issues</p>
                          ) : intDeps.map(([label, key]) => {
                            const val = (e as any)[key] as number;
                            const pct = e.internalSum > 0 ? (val / e.internalSum * 100) : 0;
                            return (
                              <div key={key} className="mb-2">
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-matrix-cloud/60">{label}</span>
                                  <span className="font-mono font-bold text-matrix-peach">{val}</span>
                                </div>
                                <div className="h-1 rounded-full" style={{ background: 'rgba(214,163,138,0.15)' }}>
                                  <div className="h-1 rounded-full transition-all" style={{ width:`${pct}%`, background: '#D6A38A' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* External deps */}
                        <div className="rounded-lg p-3"
                          style={{ background: 'rgba(95,111,125,0.06)', border: '1px solid rgba(95,111,125,0.15)' }}>
                          <p className="text-[10px] font-bold text-matrix-slate/70 uppercase tracking-widest mb-2.5">
                            External Dependencies ({e.externalSum})
                          </p>
                          {extDeps.length === 0 ? (
                            <p className="text-xs text-matrix-cloud/30">No external issues</p>
                          ) : extDeps.map(([label, key]) => {
                            const val = (e as any)[key] as number;
                            const pct = e.externalSum > 0 ? (val / e.externalSum * 100) : 0;
                            return (
                              <div key={key} className="mb-2">
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-matrix-cloud/60">{label}</span>
                                  <span className="font-mono font-bold text-matrix-slate">{val}</span>
                                </div>
                                <div className="h-1 rounded-full" style={{ background: 'rgba(95,111,125,0.15)' }}>
                                  <div className="h-1 rounded-full transition-all" style={{ width:`${pct}%`, background: '#5F6F7D' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand total footer */}
          <div className="px-4 py-3.5 grid grid-cols-12 gap-2 items-center"
            style={{ background: 'linear-gradient(135deg, #1A2428 0%, #161E22 100%)', borderTop: '1px solid rgba(214,163,138,0.15)' }}>
            <div className="col-span-1 text-matrix-peach/40 text-xs font-mono">∑</div>
            <div className="col-span-3 font-display font-bold text-matrix-cream text-sm">Grand Total</div>
            <div className="col-span-2 text-center font-mono text-matrix-cloud/70 font-bold">{totals.total.toLocaleString()}</div>
            <div className="col-span-2 text-center font-mono text-emerald-400 font-bold">{totals.online.toLocaleString()}</div>
            <div className="col-span-2 text-center font-mono text-red-400 font-bold">{totals.offline.toLocaleString()}</div>
            <div className="col-span-1 text-center">
              <span className="text-xs font-bold text-matrix-peach font-mono">{grandOfflinePct.toFixed(1)}%</span>
            </div>
            <div className="col-span-1" />
          </div>
        </div>

      ) : (
        /* ── CHARTS VIEW ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
          <div className="card p-5">
            <h3 className="font-semibold text-matrix-cream mb-1">Offline Count by District</h3>
            <p className="text-xs text-matrix-cloud/40 mb-4">Online vs Offline camera counts</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize:10, fill:'#A3ADB5' }} />
                <YAxis tick={{ fontSize:10, fill:'#A3ADB5' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="offline" name="Offline" fill="#EF4444" radius={[3,3,0,0]} />
                <Bar dataKey="online"  name="Online"  fill="#10B981" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-matrix-cream mb-1">Internal vs External</h3>
            <p className="text-xs text-matrix-cloud/40 mb-4">Dependency type breakdown</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={95} innerRadius={45}
                  dataKey="value" label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`}
                  labelLine={{ stroke: '#A3ADB5' }}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-matrix-cream mb-1">Offline % by District</h3>
            <p className="text-xs text-matrix-cloud/40 mb-4">Relative offline percentage per district</p>
            <div className="space-y-3">
              {entries.map(e => {
                const sev = offlineSeverity(e.offlinePct);
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className="w-28 text-xs font-medium text-matrix-cloud/60 truncate text-right shrink-0">
                      {e.district.name}
                    </div>
                    <div className="flex-1 h-5 rounded-full overflow-hidden relative"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(e.offlinePct, 1)}%`, background: sev.bar }} />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/80">
                        {e.offlineCount} cameras
                      </span>
                    </div>
                    <span className="w-12 text-xs font-bold text-right shrink-0 font-mono"
                      style={{ color: sev.bar }}>
                      {e.offlinePct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
