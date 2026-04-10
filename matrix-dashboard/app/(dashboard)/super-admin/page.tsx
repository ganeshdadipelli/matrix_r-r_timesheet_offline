'use client';
// app/(dashboard)/super-admin/page.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';

interface Log {
  id: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  user: { id: string; name: string; email: string; role: string };
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:           'badge-green',
  LOGOUT:          'badge-gray',
  FAILED_LOGIN:    'badge-red',
  CREATE_ENTRY:    'badge-blue',
  UPDATE_ENTRY:    'badge-yellow',
  CREATE_USER:     'badge-blue',
  UPDATE_USER:     'badge-yellow',
  DEACTIVATE_USER: 'badge-red',
};

export default function SuperAdminPage() {
  const [logs, setLogs]             = useState<Log[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ action: '', from: '', to: '' });
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async (p = 1, f = filters) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '30' });
    if (f.action) params.set('action', f.action);
    if (f.from)   params.set('from',   f.from);
    if (f.to)     params.set('to',     f.to);
    try {
      const res  = await apiFetch(`/api/v1/super-admin/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(p);
      }
    } catch (e) {
      console.error('Failed to load logs', e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1); }, []);

  function handleSearch() { load(1, filters); }

  function handleClear() {
    const cleared = { action: '', from: '', to: '' };
    setFilters(cleared);
    load(1, cleared);
  }

  const todayLogins = logs.filter(l =>
    l.action === 'LOGIN' &&
    new Date(l.createdAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Audit Logs</h2>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} total activity records</p>
        </div>
        <span className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 font-medium">
          🛡 Super Admin View
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Logs',    v: total },
          { label: 'Logins Today',  v: todayLogins },
          { label: 'Failed Logins', v: logs.filter(l => l.action === 'FAILED_LOGIN').length },
          { label: 'Data Entries',  v: logs.filter(l => l.action === 'CREATE_ENTRY').length },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-2xl font-bold text-primary-600">{s.v}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
            <select
              className="input-field w-44 text-sm"
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
            >
              <option value="">All Actions</option>
              {['LOGIN','LOGOUT','FAILED_LOGIN','CREATE_ENTRY','UPDATE_ENTRY',
                'CREATE_USER','UPDATE_USER','DEACTIVATE_USER'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" className="input-field w-36 text-sm" value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" className="input-field w-36 text-sm" value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
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
                {['Time','User','Role','Action','Resource','IP','Details'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <svg className="animate-spin w-5 h-5 mx-auto mb-2 text-primary-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                    </svg>
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">No logs found</td>
                </tr>
              ) : (
                logs.map(log => (
                  <React.Fragment key={log.id}>

                    {/* Main row */}
                    <tr
                      className="hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="table-td text-xs font-mono">
                        {format(new Date(log.createdAt), 'MM/dd HH:mm:ss')}
                      </td>
                      <td className="table-td font-sans">
                        <div className="font-medium text-slate-800 text-sm">{log.user.name}</div>
                        <div className="text-xs text-slate-400">{log.user.email}</div>
                      </td>
                      <td className="table-td">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          log.user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700'    :
                          log.user.role === 'ADMIN'       ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                        }`}>
                          {log.user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={ACTION_COLORS[log.action] || 'badge-gray'}>
                          {log.action}
                        </span>
                      </td>
                      <td className="table-td text-xs">{log.resource || '—'}</td>
                      <td className="table-td text-xs font-mono">{log.ipAddress || '—'}</td>
                      <td className="table-td text-xs text-primary-500">
                        {(log.oldData || log.newData)
                          ? (expanded === log.id ? '▲ collapse' : '▼ expand')
                          : '—'}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expanded === log.id && (log.oldData || log.newData) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {log.oldData && (
                              <div>
                                <p className="text-xs font-semibold text-red-600 mb-1">Before</p>
                                <pre className="text-xs bg-red-50 p-2 rounded border border-red-100 overflow-auto max-h-40">
                                  {JSON.stringify(log.oldData as object, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newData && (
                              <div>
                                <p className="text-xs font-semibold text-green-600 mb-1">After</p>
                                <pre className="text-xs bg-green-50 p-2 rounded border border-green-100 overflow-auto max-h-40">
                                  {JSON.stringify(log.newData as object, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages} ({total.toLocaleString()} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1, filters)}
                disabled={page <= 1}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >← Prev</button>
              <button
                onClick={() => load(page + 1, filters)}
                disabled={page >= totalPages}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >Next →</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}