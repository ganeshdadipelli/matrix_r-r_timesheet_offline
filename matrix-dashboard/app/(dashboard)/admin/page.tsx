'use client';
// app/(dashboard)/admin/page.tsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  district?: { id: string; name: string; code: string } | null;
}

interface District {
  id: string;
  name: string;
  code: string;
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-yellow-100 text-yellow-700',
  FIELD_USER: 'bg-green-100 text-green-700',
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FIELD_USER',
    districtId: '',
    isActive: true,
  });

  async function loadUsers() {
    const r = await apiFetch('/api/v1/admin/users');
    const d = await r.json();
    if (d.success) setUsers(d.data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
    apiFetch('/api/v1/districts')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDistricts(d.data);
      });
  }, []);

  async function handleSave() {
    setError('');
    setSuccess('');

    const url = editUser ? `/api/v1/admin/users/${editUser.id}` : '/api/v1/admin/users';
    const method = editUser ? 'PUT' : 'POST';

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      districtId: form.districtId || null,
      isActive: form.isActive,
    };

    if (form.password) payload.password = form.password;

    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed');
      return;
    }

    setSuccess(editUser ? 'User updated!' : 'User created!');
    setShowForm(false);
    setEditUser(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'FIELD_USER',
      districtId: '',
      isActive: true,
    });
    loadUsers();
    setTimeout(() => setSuccess(''), 3000);
  }

  async function toggleActive(u: User) {
    await apiFetch(`/api/v1/admin/users/${u.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    loadUsers();
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      districtId: u.district?.id || '',
      isActive: u.isActive,
    });
    setShowForm(true);
    setError('');
  }

  const F = (key: keyof typeof form, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} users registered</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditUser(null);
            setForm({
              name: '',
              email: '',
              password: '',
              role: 'FIELD_USER',
              districtId: '',
              isActive: true,
            });
          }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✅ {success}
        </div>
      )}

      {showForm && (
        <div className="card p-5 border-2 border-primary-200">
          <h3 className="font-semibold text-slate-700 mb-4">
            {editUser ? 'Edit User' : 'Create New User'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => F('name', e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                className="input-field"
                type="email"
                value={form.email}
                onChange={(e) => F('email', e.target.value)}
                placeholder="email@matrix.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password {editUser ? '(leave blank to keep)' : '*'}
              </label>
              <input
                className="input-field"
                type="password"
                value={form.password}
                onChange={(e) => F('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) => F('role', e.target.value)}
              >
                <option value="FIELD_USER">Field User</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            {form.role === 'FIELD_USER' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assign District
                </label>
                <select
                  className="input-field"
                  value={form.districtId}
                  onChange={(e) => F('districtId', e.target.value)}
                >
                  <option value="">No district</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editUser && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm font-medium text-slate-700">Status:</span>
                <button
                  onClick={() => F('isActive', !form.isActive)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                    form.isActive ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform ${
                      form.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-600">
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
               {error}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="btn-primary text-sm">
              {editUser ? 'Save Changes' : 'Create User'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditUser(null);
                setError('');
              }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'District', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="table-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="table-td font-sans font-medium text-slate-800">{u.name}</td>
                    <td className="table-td text-slate-600">{u.email}</td>
                    <td className="table-td">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role]}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-td font-sans">{u.district?.name || '—'}</td>
                    <td className="table-td">
                      <span className={u.isActive ? 'badge-green' : 'badge-gray'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                    <td className="table-td">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-primary-600 hover:underline text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          className={`text-xs font-medium ${
                            u.isActive ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}