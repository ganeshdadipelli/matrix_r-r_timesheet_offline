'use client';
// app/(dashboard)/admin/page.tsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { UserPlus, CheckCircle, AlertCircle, Users, RefreshCw, Check } from 'lucide-react';

interface User {
  id: string; name: string; email: string; role: string;
  isActive: boolean; createdAt: string;
  district?: { id: string; name: string; code: string } | null;
  districtIds?: string[];
}
interface District { id: string; name: string; code: string; sortOrder?: number; }

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.25)' },
  ADMIN:       { bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.25)' },
  FIELD_USER:  { bg:'rgba(16,185,129,0.12)',  text:'#6EE7B7', border:'rgba(16,185,129,0.25)' },
};

const EMPTY_FORM = { name:'', email:'', password:'', role:'FIELD_USER', districtIds:[] as string[], isActive:true };

export default function AdminPage() {
  const [users, setUsers]         = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [form, setForm]           = useState(EMPTY_FORM);

  const currentUser = getSessionUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  async function loadUsers() {
    const r = await apiFetch('/api/v1/admin/users');
    const d = await r.json();
    if (d.success) setUsers(d.data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
    apiFetch('/api/v1/districts').then(r => r.json()).then(d => { if (d.success) setDistricts(d.data); });
  }, []);

  function F<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    setError(''); setSuccess('');
    if (form.role === 'FIELD_USER' && form.districtIds.length === 0) {
      setError('At least one district is required for Field User.'); return;
    }
    const url    = editUser ? `/api/v1/admin/users/${editUser.id}` : '/api/v1/admin/users';
    const method = editUser ? 'PUT' : 'POST';
    const payload: Record<string, unknown> = {
      name: form.name, email: form.email, role: form.role,
      districtIds: form.role === 'FIELD_USER' ? form.districtIds : [],
      isActive: form.isActive,
    };
    if (form.password) payload.password = form.password;
    const res  = await apiFetch(url, { method, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); return; }
    setSuccess(editUser ? 'User updated successfully.' : 'User created successfully.');
    setShowForm(false); setEditUser(null);
    setForm(EMPTY_FORM);
    loadUsers();
    setTimeout(() => setSuccess(''), 4000);
  }

  async function toggleActive(u: User) {
    await apiFetch(`/api/v1/admin/users/${u.id}`, { method:'PUT', body: JSON.stringify({ isActive: !u.isActive }) });
    loadUsers();
  }

  async function handleDelete(u: User) {
    if (!window.confirm(`Permanently delete "${u.name}"? This cannot be undone.`)) return;
    const res  = await apiFetch(`/api/v1/admin/users/${u.id}?permanent=true`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Delete failed'); return; }
    setSuccess(`User "${u.name}" permanently deleted.`);
    loadUsers();
    setTimeout(() => setSuccess(''), 4000);
  }

  function openEdit(u: User) {
    setEditUser(u);
    const ids = u.districtIds?.length ? u.districtIds : (u.district?.id ? [u.district.id] : []);
    setForm({ name:u.name, email:u.email, password:'', role:u.role, districtIds:ids, isActive:u.isActive });
    setShowForm(true); setError('');
  }

  function toggleDistrict(id: string) {
    setForm(f => ({
      ...f,
      districtIds: f.districtIds.includes(id)
        ? f.districtIds.filter(x => x !== id)
        : [...f.districtIds, id],
    }));
  }

  const labelClass = "block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(95,111,125,0.2)', border:'1px solid rgba(95,111,125,0.3)' }}>
            <Users className="w-5 h-5 text-matrix-slate" />
          </div>
          <div>
            <h2 className="section-title">User Management</h2>
            <p className="section-subtitle">{users.length} users registered</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditUser(null); setError(''); setForm(EMPTY_FORM); }}
          className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-xl p-3.5 flex items-center gap-2.5 animate-fade-in"
          style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-fade-in-up"
          style={{ borderColor:'rgba(214,163,138,0.25)', background:'rgba(38,48,53,0.95)' }}>
          <h3 className="font-semibold text-matrix-cream mb-5 font-display">
            {editUser ? 'Edit User' : 'Create New User'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className={labelClass}>Full Name *</label>
              <input className="input-field" value={form.name} onChange={e => F('name', e.target.value)} placeholder="Full name" />
            </div>
            {/* Email */}
            <div>
              <label className={labelClass}>Email *</label>
              <input className="input-field" type="email" value={form.email} onChange={e => F('email', e.target.value)} placeholder="email@matrix.com" />
            </div>
            {/* Password */}
            <div>
              <label className={labelClass}>Password {editUser ? '(leave blank to keep)' : '*'}</label>
              <input className="input-field" type="password" value={form.password} onChange={e => F('password', e.target.value)} placeholder="••••••••" />
            </div>
            {/* Role */}
            <div>
              <label className={labelClass}>Role *</label>
              <select className="input-field" value={form.role} onChange={e => F('role', e.target.value)}>
                <option value="FIELD_USER">Field User</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            {/* Status toggle (edit only) */}
            {editUser && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-matrix-cloud/50 uppercase tracking-widest font-semibold">Status</span>
                <button type="button" onClick={() => F('isActive', !form.isActive)}
                  className="relative inline-flex h-6 w-11 rounded-full transition-all duration-300"
                  style={{ background: form.isActive ? '#10B981' : '#2E3D44' }}>
                  <span className={`inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform duration-300 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm" style={{ color: form.isActive ? '#6EE7B7' : '#A3ADB5' }}>
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            )}

            {/* Multi-district selector — only for FIELD_USER */}
            {form.role === 'FIELD_USER' && (
              <div className="sm:col-span-2">
                {/* Label row with All / Clear */}
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + ' mb-0'}>
                    Assign Districts
                    {form.districtIds.length > 0 && (
                      <span style={{ color:'#D6A38A' }}> · {form.districtIds.length} selected</span>
                    )}
                  </label>
                  <div className="flex gap-4">
                    <button type="button"
                      onClick={() => F('districtIds', districts.map(d => d.id))}
                      className="text-[10px] font-bold uppercase tracking-wide transition-colors"
                      style={{ color:'#D6A38A' }}>
                      Select All
                    </button>
                    <button type="button"
                      onClick={() => F('districtIds', [])}
                      className="text-[10px] font-bold uppercase tracking-wide transition-colors"
                      style={{ color:'#5F6F7D' }}>
                      Clear
                    </button>
                  </div>
                </div>

                {/* Scrollable checkbox list */}
                <div className="rounded-xl overflow-hidden overflow-y-auto"
                  style={{ border:'1px solid rgba(95,111,125,0.25)', background:'rgba(22,30,34,0.7)', maxHeight:'220px' }}>
                  {districts.length === 0 ? (
                    <p className="text-center py-5 text-matrix-cloud/30 text-sm">No districts found.</p>
                  ) : districts.map((d, i) => {
                    const checked = form.districtIds.includes(d.id);
                    return (
                      <label key={d.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors"
                        style={{
                          background: checked ? 'rgba(214,163,138,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                          borderBottom: i < districts.length - 1 ? '1px solid rgba(95,111,125,0.1)' : 'none',
                        }}>
                        {/* Custom checkbox */}
                        <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center transition-all duration-150"
                          style={{
                            background: checked ? '#D6A38A' : 'rgba(95,111,125,0.2)',
                            border: `1px solid ${checked ? '#D6A38A' : 'rgba(95,111,125,0.4)'}`,
                          }}>
                          {checked && <Check className="w-2.5 h-2.5" style={{ color:'#1F2A2E' }} />}
                        </div>
                        <input type="checkbox" checked={checked} className="sr-only" readOnly
                          onClick={() => toggleDistrict(d.id)} />
                        <span className="text-sm flex-1 font-medium transition-colors"
                          style={{ color: checked ? '#EDEAE6' : '#A3ADB5' }}>
                          {d.name}
                        </span>
                        <span className="text-[10px] font-mono font-semibold"
                          style={{ color: checked ? '#D6A38A' : '#5F6F7D' }}>
                          {d.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg flex items-center gap-2 animate-fade-in"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} className="btn-primary">{editUser ? 'Save Changes' : 'Create User'}</button>
            <button onClick={() => { setShowForm(false); setEditUser(null); setError(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Name','Email','Role','Districts','Status','Created','Actions'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-matrix-cloud/30 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-matrix-slate/40" />
                  Loading users…
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-matrix-cloud/30 text-sm">No users found.</td></tr>
              ) : users.map(u => {
                const rs = ROLE_STYLE[u.role] || ROLE_STYLE.FIELD_USER;
                const ids = u.districtIds || (u.district?.id ? [u.district.id] : []);
                return (
                  <tr key={u.id} className="table-tr-hover">
                    <td className="table-td font-sans font-semibold text-matrix-cream">{u.name}</td>
                    <td className="table-td text-matrix-cloud/60 font-sans text-sm">{u.email}</td>
                    <td className="table-td">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
                        style={{ background:rs.bg, color:rs.text, borderColor:rs.border }}>
                        {u.role.replace('_',' ')}
                      </span>
                    </td>
                    <td className="table-td">
                      {ids.length === 0 ? (
                        <span className="text-matrix-cloud/30 text-sm">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ids.slice(0, 4).map(id => {
                            const d = districts.find(x => x.id === id);
                            return d ? (
                              <span key={id} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold"
                                style={{ background:'rgba(95,111,125,0.15)', color:'#7C8A96', border:'1px solid rgba(95,111,125,0.2)' }}>
                                {d.code}
                              </span>
                            ) : null;
                          })}
                          {ids.length > 4 && (
                            <span className="text-[9px] text-matrix-cloud/35 self-center font-mono">+{ids.length - 4}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={u.isActive ? 'badge-green' : 'badge-gray'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-matrix-cloud/40">{format(new Date(u.createdAt),'dd MMM yyyy')}</td>
                    <td className="table-td">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(u)}
                          className="text-xs font-semibold text-matrix-slate hover:text-matrix-cloud transition-colors">
                          Edit
                        </button>
                        <button onClick={() => toggleActive(u)}
                          className={`text-xs font-semibold transition-colors ${u.isActive ? 'text-red-400/70 hover:text-red-400' : 'text-emerald-400/70 hover:text-emerald-400'}`}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(u)}
                            className="text-xs font-semibold text-red-600/60 hover:text-red-500 transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
