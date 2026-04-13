'use client';
// app/(dashboard)/super-admin/page.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import { ShieldCheck, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

interface Log {
  id: string; action: string; resource?: string;
  ipAddress?: string; userAgent?: string; createdAt: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  user: { id: string; name: string; email: string; role: string };
}

const ACTION_STYLE: Record<string, { bg:string; text:string; border:string }> = {
  LOGIN:           { bg:'rgba(16,185,129,0.12)',  text:'#6EE7B7', border:'rgba(16,185,129,0.25)' },
  LOGOUT:          { bg:'rgba(95,111,125,0.12)',  text:'#A3ADB5', border:'rgba(95,111,125,0.25)' },
  FAILED_LOGIN:    { bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.25)' },
  CREATE_ENTRY:    { bg:'rgba(95,111,125,0.12)',  text:'#A3ADB5', border:'rgba(95,111,125,0.25)' },
  UPDATE_ENTRY:    { bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.25)' },
  CREATE_USER:     { bg:'rgba(214,163,138,0.12)', text:'#D6A38A', border:'rgba(214,163,138,0.25)' },
  UPDATE_USER:     { bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.25)' },
  DEACTIVATE_USER: { bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.25)' },
};

const ROLE_STYLE: Record<string, { bg:string; text:string; border:string }> = {
  SUPER_ADMIN: { bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.2)' },
  ADMIN:       { bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.2)' },
  FIELD_USER:  { bg:'rgba(16,185,129,0.12)',  text:'#6EE7B7', border:'rgba(16,185,129,0.2)' },
};

export default function SuperAdminPage() {
  const [logs, setLogs]             = useState<Log[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ action:'', from:'', to:'' });
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async (p = 1, f = filters) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit:'30' });
    if (f.action) params.set('action', f.action);
    if (f.from)   params.set('from',   f.from);
    if (f.to)     params.set('to',     f.to);
    try {
      const res  = await apiFetch(`/api/v1/super-admin/logs?${params}`);
      const data = await res.json();
      if (data.success) { setLogs(data.data); setTotal(data.total); setTotalPages(data.totalPages); setPage(p); }
    } catch (e) { console.error('Failed to load logs', e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, []);

  function handleSearch() { load(1, filters); }
  function handleClear()  { const c={action:'',from:'',to:''}; setFilters(c); load(1,c); }

  const todayLogins   = logs.filter(l => l.action==='LOGIN' && new Date(l.createdAt).toDateString()===new Date().toDateString()).length;
  const failedLogins  = logs.filter(l => l.action==='FAILED_LOGIN').length;
  const dataEntries   = logs.filter(l => l.action==='CREATE_ENTRY').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <ShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="section-title">Audit Logs</h2>
            <p className="section-subtitle">{total.toLocaleString()} total activity records</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#FCA5A5' }}>
          <ShieldCheck className="w-3 h-3" /> Super Admin View
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Logs',    v:total,       color:'#5F6F7D' },
          { label:'Logins Today',  v:todayLogins,  color:'#10B981' },
          { label:'Failed Logins', v:failedLogins, color:'#EF4444' },
          { label:'Data Entries',  v:dataEntries,  color:'#D6A38A' },
        ].map(s => (
          <div key={s.label} className="stat-card text-center py-4 animate-fade-in">
            <p className="text-2xl font-bold font-mono" style={{ color:s.color }}>{s.v}</p>
            <p className="text-xs text-matrix-cloud/40 mt-1 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5">Action</label>
            <select className="input-field w-44 text-sm" value={filters.action}
              onChange={e=>setFilters(f=>({...f,action:e.target.value}))}>
              <option value="">All Actions</option>
              {['LOGIN','LOGOUT','FAILED_LOGIN','CREATE_ENTRY','UPDATE_ENTRY','CREATE_USER','UPDATE_USER','DEACTIVATE_USER'].map(a=>(
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5">From</label>
            <input type="date" className="input-field w-36 text-sm" value={filters.from}
              onChange={e=>setFilters(f=>({...f,from:e.target.value}))} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5">To</label>
            <input type="date" className="input-field w-36 text-sm" value={filters.to}
              onChange={e=>setFilters(f=>({...f,to:e.target.value}))} />
          </div>
          <button onClick={handleSearch} className="btn-primary py-2 px-4 text-sm">Search</button>
          <button onClick={handleClear}  className="btn-secondary py-2 px-4 text-sm">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Time','User','Role','Action','Resource','IP','Details'].map(h=>(
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-14 text-matrix-cloud/30">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-matrix-slate/40" />
                  Loading logs…
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14 text-matrix-cloud/30">No logs found</td></tr>
              ) : logs.map(log => {
                const as = ACTION_STYLE[log.action] || ACTION_STYLE.LOGOUT;
                const rs = ROLE_STYLE[log.user.role] || ROLE_STYLE.FIELD_USER;
                const hasDetail = !!(log.oldData || log.newData);
                return (
                  <React.Fragment key={log.id}>
                    <tr className="table-tr-hover cursor-pointer" onClick={()=>setExpanded(expanded===log.id?null:log.id)}>
                      <td className="table-td text-[11px] font-mono text-matrix-cloud/40">
                        {format(new Date(log.createdAt),'MM/dd HH:mm:ss')}
                      </td>
                      <td className="table-td font-sans">
                        <div className="font-medium text-matrix-cream text-sm">{log.user.name}</div>
                        <div className="text-[11px] text-matrix-cloud/30 font-mono">{log.user.email}</div>
                      </td>
                      <td className="table-td">
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold border"
                          style={{ background:rs.bg, color:rs.text, borderColor:rs.border }}>
                          {log.user.role.replace('_',' ')}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
                          style={{ background:as.bg, color:as.text, borderColor:as.border }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="table-td text-xs text-matrix-cloud/40">{log.resource || '—'}</td>
                      <td className="table-td text-[11px] font-mono text-matrix-cloud/30">{log.ipAddress || '—'}</td>
                      <td className="table-td text-xs">
                        {hasDetail ? (
                          expanded===log.id
                            ? <ChevronDown className="w-4 h-4 text-matrix-slate" />
                            : <ChevronRight className="w-4 h-4 text-matrix-cloud/30" />
                        ) : <span className="text-matrix-cloud/20">—</span>}
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {expanded===log.id && hasDetail && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 animate-fade-in"
                          style={{ background:'rgba(22,30,34,0.7)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {log.oldData && (
                              <div>
                                <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest mb-2">Before</p>
                                <pre className="text-[11px] font-mono p-3 rounded-lg overflow-auto max-h-40 text-matrix-cloud/60"
                                  style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
                                  {JSON.stringify(log.oldData, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newData && (
                              <div>
                                <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest mb-2">After</p>
                                <pre className="text-[11px] font-mono p-3 rounded-lg overflow-auto max-h-40 text-matrix-cloud/60"
                                  style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)' }}>
                                  {JSON.stringify(log.newData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-matrix-cloud/30">
              Page {page} of {totalPages} · {total.toLocaleString()} records
            </p>
            <div className="flex gap-2">
              <button onClick={()=>load(page-1,filters)} disabled={page<=1}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-30">← Prev</button>
              <button onClick={()=>load(page+1,filters)} disabled={page>=totalPages}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
