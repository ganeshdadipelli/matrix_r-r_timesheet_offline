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
  Wifi, WifiOff, Monitor, MapPin,
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
  ['CAT6 Cable',       'cat6Cable'],
  ['3-Core Power',     'threeCorepower'],
  ['GPON Issues',      'gponIssues'],
  ['OFC Issues',       'ofcIssues'],
  ['Cam Store/Repl',   'cameraStoreReplacement'],
  ['Cam Fluctuating',  'camerasFluctuating'],
  ['Need to Check',    'needToCheck'],
  ['Fiber Required',   'fiberRequired'],
  ['Hydra Ladder',     'hydraLadder'],
  ['MCB Issue',        'mcbIssue'],
  ['8-Port Switch',    'switch8portIssue'],
] as const;

const EXT_DEPS = [
  ['Road Extension',   'roadExtensionConstruction'],
  ['No OLT',           'noOlt'],
  ['Pop Down',         'popDown'],
  ['JB Accident',      'jbAccident'],
  ['Renovation',       'renovation'],
  ['Power Disc.',      'powerDisconnection'],
  ['DGP Office',       'dgpOffice'],
  ['Need Peer IP',     'needPeerIp'],
] as const;

function offlineColor(pct: number) {
  if (pct < 10) return { bar: 'bg-green-500',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' };
  if (pct < 15) return { bar: 'bg-yellow-500', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' };
  if (pct < 20) return { bar: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' };
  return           { bar: 'bg-red-500',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700' };
}

function StatCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {Icon && <Icon className={`w-5 h-5 ${color} opacity-30 mt-1`} />}
      </div>
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

  const internalTotal = entries.reduce((s, e) => s + e.internalSum, 0);
  const externalTotal = entries.reduce((s, e) => s + e.externalSum, 0);

  const barData     = entries.map(e => ({ name: e.district.code, offline: e.offlineCount, online: e.onlineCount }));
  const pieData     = [{ name:'Internal', value: internalTotal }, { name:'External', value: externalTotal }].filter(d=>d.value>0);
  const PIE_COLORS  = ['#F59E0B', '#0F4C81'];

  async function downloadExcel() {
  try {
    const params = new URLSearchParams({ from: date, to: date, format: 'xlsx' });
    const res = await apiFetch(`/api/v1/entries/download?${params.toString()}`);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || 'Download failed');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-dependencies-${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('Download failed. Please try again.');
  }
}
    
  

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Offline Dependencies Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Andhra Pradesh Camera Network — 13 Districts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDate(e.target.value)}className="input-field w-auto text-sm" />
          <button onClick={load} className="btn-secondary p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={downloadExcel} disabled={!entries.length}
            className="btn-primary py-2 px-3 flex items-center gap-1.5 text-sm disabled:opacity-40">
            <Download className="w-4 h-4" /> Export Day Excel
          </button>
          <Link href="/data-tools"
            className="btn-secondary py-2 px-3 flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Bulk Export / Upload
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cameras"      value={totals.total.toLocaleString()}   color="text-slate-800"   icon={Monitor} />
        <StatCard label="Online"             value={totals.online.toLocaleString()}  color="text-green-600"   icon={Wifi}
          sub={`${grandOnlinePct.toFixed(1)}% online`} />
        <StatCard label="Offline"            value={totals.offline.toLocaleString()} color="text-red-600"     icon={WifiOff}
          sub={`${grandOfflinePct.toFixed(1)}% offline`} />
        <StatCard label="Districts Reported" value={`${entries.length} / 13`}        color="text-primary-600" icon={MapPin} />
      </div>

      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['table','charts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
              tab===t ? 'bg-white shadow-sm text-primary-600' : 'text-slate-600 hover:text-slate-800'
            }`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="card p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <WifiOff className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No data for {date}</p>
          <p className="text-slate-400 text-sm mt-1">Field team hasn't submitted entries yet.</p>
        </div>
      ) : tab === 'table' ? (
        <div className="card overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-3">District</div>
            <div className="col-span-2 text-center">Total</div>
            <div className="col-span-2 text-center text-green-600">Online</div>
            <div className="col-span-2 text-center text-red-600">Offline</div>
            <div className="col-span-1 text-center">%</div>
            <div className="col-span-1 text-center">Details</div>
          </div>

          <div className="divide-y divide-slate-100">
            {entries.map((e, i) => {
              const c = offlineColor(e.offlinePct);
              const isOpen = expanded.has(e.id);
              const intDeps = INT_DEPS.filter(([, k]) => (e as any)[k] > 0);
              const extDeps = EXT_DEPS.filter(([, k]) => (e as any)[k] > 0);

              return (
                <div key={e.id} className={isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}>
                  <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-xs text-slate-400 font-mono">{i+1}</div>

                    <div className="col-span-3">
                      <p className="font-semibold text-sm text-primary-700 truncate">{e.district.name}</p>
                      <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden w-full">
                        <div className={`h-full rounded-full ${c.bar}`}
                          style={{ width: `${e.offlinePct}%` }} />
                      </div>
                    </div>

                    <div className="col-span-2 text-center font-mono text-sm text-slate-700 font-medium">
                      {e.totalCount.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-center font-mono text-sm text-green-700 font-medium">
                      {e.onlineCount.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-center font-mono text-sm text-red-700 font-bold">
                      {e.offlineCount.toLocaleString()}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>
                        {e.offlinePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => toggleExpand(e.id)}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                        {isOpen
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-dashed border-slate-200">
                      <div className="flex items-center gap-4 text-xs text-slate-500 bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Online: <strong className="text-green-700">{e.onlineCount.toLocaleString()} ({e.onlinePct.toFixed(1)}%)</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Offline: <strong className="text-red-700">{e.offlineCount.toLocaleString()} ({e.offlinePct.toFixed(1)}%)</strong>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          Internal: <strong className="text-amber-700">{e.internalSum}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          External: <strong className="text-teal-700">{e.externalSum}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                          <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
                            Internal Dependencies ({e.internalSum} cameras)
                          </p>
                          {intDeps.length === 0 ? (
                            <p className="text-xs text-slate-400">No internal issues</p>
                          ) : (
                            <div className="space-y-1.5">
                              {intDeps.map(([label, key]) => {
                                const val = (e as any)[key] as number;
                                const pct = e.internalSum > 0 ? (val / e.internalSum * 100) : 0;
                                return (
                                  <div key={key}>
                                    <div className="flex justify-between text-xs mb-0.5">
                                      <span className="text-slate-600">{label}</span>
                                      <span className="font-mono font-semibold text-amber-700">{val}</span>
                                    </div>
                                    <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-400 rounded-full" style={{ width:`${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                          <p className="text-xs font-semibold text-teal-700 mb-2 uppercase tracking-wide">
                            External Dependencies ({e.externalSum} cameras)
                          </p>
                          {extDeps.length === 0 ? (
                            <p className="text-xs text-slate-400">No external issues</p>
                          ) : (
                            <div className="space-y-1.5">
                              {extDeps.map(([label, key]) => {
                                const val = (e as any)[key] as number;
                                const pct = e.externalSum > 0 ? (val / e.externalSum * 100) : 0;
                                return (
                                  <div key={key}>
                                    <div className="flex justify-between text-xs mb-0.5">
                                      <span className="text-slate-600">{label}</span>
                                      <span className="font-mono font-semibold text-teal-700">{val}</span>
                                    </div>
                                    <div className="h-1 bg-teal-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-teal-400 rounded-full" style={{ width:`${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-primary-900 px-4 py-3 grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1 text-primary-400 text-xs">∑</div>
            <div className="col-span-3 text-white font-bold text-sm">Grand Total</div>
            <div className="col-span-2 text-center font-mono text-white font-bold">{totals.total.toLocaleString()}</div>
            <div className="col-span-2 text-center font-mono text-green-300 font-bold">{totals.online.toLocaleString()}</div>
            <div className="col-span-2 text-center font-mono text-red-300 font-bold">{totals.offline.toLocaleString()}</div>
            <div className="col-span-1 text-center">
              <span className="text-xs font-bold text-yellow-300">{grandOfflinePct.toFixed(1)}%</span>
            </div>
            <div className="col-span-1" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Offline Count by District</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize:10 }} />
                <YAxis tick={{ fontSize:11 }} />
                <Tooltip />
                <Bar dataKey="offline" name="Offline" fill="#DC2626" radius={[3,3,0,0]} />
                <Bar dataKey="online"  name="Online"  fill="#16A34A" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Internal vs External</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                  dataKey="value" label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-slate-700 mb-4">Offline % by District</h3>
            <div className="space-y-3">
              {entries.map(e => {
                const c = offlineColor(e.offlinePct);
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className="w-28 text-xs font-medium text-slate-600 truncate text-right shrink-0">
                      {e.district.name}
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                      <div className={`h-full rounded-full transition-all ${c.bar}`}
                        style={{ width: `${Math.max(e.offlinePct, 1)}%` }} />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white mix-blend-overlay">
                        {e.offlineCount} cameras
                      </span>
                    </div>
                    <span className={`w-12 text-xs font-bold text-right shrink-0 ${c.text}`}>
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