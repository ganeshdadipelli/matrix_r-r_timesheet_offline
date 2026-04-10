'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Power, Trash2, Upload, UserPlus, X, Briefcase, Mail, Building2, UserRound, ArrowRight, MapPin, Users, Shield } from 'lucide-react';

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string | null;
  domain?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  rrCategories?: { id: string; title: string }[];
  children?: Person[];
  district?: { id: string; name: string; code: string } | null;
};

type District = { id: string; name: string; code: string };

type RRRow = { title: string; responsibilities: string; kpiTargets: string; actionPoints: string; };

const EMPTY_RR: RRRow = { title: '', responsibilities: '', kpiTargets: '', actionPoints: '' };

const ROLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  SUPER_ADMIN: [{ value: 'SUPER_BOSS', label: 'DC Head' }, { value: 'MANAGER', label: 'Manager' }, { value: 'TEAM_MEMBER', label: 'Team Member' }],
  SUPER_BOSS: [{ value: 'SUPER_BOSS', label: 'DC Head' }, { value: 'MANAGER', label: 'Manager' }, { value: 'TEAM_MEMBER', label: 'Team Member' }],
  MANAGER: [{ value: 'TEAM_MEMBER', label: 'Team Member' }],
};

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="h-10 w-10 rounded-xl object-cover ring-2 ring-white" />;
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-primary-600 font-bold text-white ring-2 ring-white">
      {name.charAt(0)}
    </div>
  );
}

export default function AdminPage() {
  const user = getSessionUser();
  const roleOptions = ROLE_OPTIONS[user?.role || ''] || [];

  /* Tab state */
  const [activeTab, setActiveTab] = useState<'org' | 'field'>('org');

  /* Org team state */
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [managerOptions, setManagerOptions] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: 'DC@2026', role: roleOptions[0]?.value || 'TEAM_MEMBER',
    designation: '', domain: '', photoUrl: '', parentId: '',
  });

  const [rrRows, setRrRows] = useState<RRRow[]>([{ ...EMPTY_RR }]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [selectedManagerId, setSelectedManagerId] = useState<string>('direct');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', designation: '', domain: '', photoUrl: '', isActive: true });

  /* Field team state */
  const [fieldUsers, setFieldUsers] = useState<Person[]>([]);
  const [fieldLoading, setFieldLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isFieldCreateOpen, setIsFieldCreateOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState({ name: '', email: '', password: 'DC@2026', role: 'FIELD_USER', districtId: '' });
  const [fieldSaving, setFieldSaving] = useState(false);
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editFieldForm, setEditFieldForm] = useState({ name: '', isActive: true, districtId: '' });

  const needsManagerSelection = useMemo(() => {
    if (form.role === 'SUPER_BOSS') return false;
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'SUPER_BOSS') return true;
    return false;
  }, [form.role, user?.role]);

  async function loadData() {
    setLoading(true);
    try {
      const [hierarchyRes, usersRes] = await Promise.all([apiFetch('/api/v1/hierarchy'), apiFetch('/api/v1/users?role=MANAGER,SUPER_BOSS')]);
      const hierarchyJson = await hierarchyRes.json();
      const usersJson = await usersRes.json();

      if (hierarchyJson.success) setHierarchy(hierarchyJson.data);
      if (usersJson.success) setManagerOptions(usersJson.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); loadFieldData(); }, []);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  /* Field team data loaders */
  async function loadFieldData() {
    setFieldLoading(true);
    try {
      const [usersRes, distRes] = await Promise.all([
        apiFetch('/api/v1/users?role=FIELD_USER,ADMIN'),
        apiFetch('/api/v1/districts'),
      ]);
      const usersJson = await usersRes.json();
      const distJson = await distRes.json();
      if (usersJson.success) setFieldUsers(usersJson.data || []);
      if (distJson.success) setDistricts(distJson.data || []);
    } finally { setFieldLoading(false); }
  }

  async function handleFieldCreate(e: React.FormEvent) {
    e.preventDefault();
    setFieldSaving(true); setSuccess(''); setError('');
    try {
      const res = await apiFetch('/api/v1/users', { method: 'POST', body: JSON.stringify(fieldForm) });
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Failed'); setFieldSaving(false); return; }
      setSuccess(`${fieldForm.name} created`);
      setIsFieldCreateOpen(false);
      setFieldForm({ name: '', email: '', password: 'DC@2026', role: 'FIELD_USER', districtId: '' });
      await loadFieldData();
    } catch { setError('Server error'); } finally { setFieldSaving(false); }
  }

  function openFieldEdit(p: Person) {
    setEditFieldId(p.id);
    setEditFieldForm({ name: p.name, isActive: p.isActive, districtId: p.district?.id || '' });
  }

  async function saveFieldEdit() {
    if (!editFieldId) return;
    // Note: districtId changes need to go through a separate PATCH since the existing one doesn't support it
    const res = await apiFetch('/api/v1/users', { method: 'PATCH', body: JSON.stringify({ id: editFieldId, name: editFieldForm.name, isActive: editFieldForm.isActive }) });
    const json = await res.json();
    if (!json.success) { setError(json.error || 'Update failed'); return; }
    setEditFieldId(null);
    await loadFieldData();
  }

  async function removeFieldUser(p: Person) {
    if (!confirm(`Delete ${p.name}?`)) return;
    const res = await apiFetch(`/api/v1/users?id=${p.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) { setError(json.error || 'Failed'); return; }
    await loadFieldData();
  }

  const managers: Person[] = useMemo(() => {
    if (!hierarchy) return [];
    if (hierarchy.type === 'manager') return [{ ...hierarchy.self, children: hierarchy.team || [] }];
    if (hierarchy.type === 'hierarchy') return hierarchy.managers || [];
    return [];
  }, [hierarchy]);

  const heads: Person[] = useMemo(() => {
    if (!hierarchy) return [];
    if (hierarchy.type === 'hierarchy') return hierarchy.heads || [];
    return [];
  }, [hierarchy]);

  const directMembers: Person[] = hierarchy?.directMembers || [];
  const selectedManager = selectedManagerId === 'direct' ? null : 
     (heads.find((h: any) => h.id === selectedManagerId) || managers.find((m: any) => m.id === selectedManagerId) || heads[0] || managers[0] || null);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addRR() { setRrRows(prev => [...prev, { ...EMPTY_RR }]); }
  function removeRR(index: number) { setRrRows(prev => prev.filter((_, i) => i !== index)); }
  function updateRR(index: number, key: keyof RRRow, value: string) { setRrRows(prev => prev.map((row, i) => i === index ? { ...row, [key]: value } : row)); }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSuccess(''); setError('');

    try {
      const validRRs = rrRows.filter(row => row.title.trim() && row.responsibilities.trim());
      const res = await apiFetch('/api/v1/users', { method: 'POST', body: JSON.stringify({ ...form, parentId: needsManagerSelection ? form.parentId || null : null, rrCategories: validRRs }) });
      const json = await res.json();

      if (!json.success) { setError(json.error || 'Failed to create user'); setSaving(false); return; }

      setSuccess(`${form.name} created successfully.`);
      setIsCreateModalOpen(false);
      setForm({ name: '', email: '', password: 'DC@2026', role: roleOptions[0]?.value || 'TEAM_MEMBER', designation: '', domain: '', photoUrl: '', parentId: '' });
      setRrRows([{ ...EMPTY_RR }]);
      await loadData();
    } catch {
      setError('Server connection failed');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(person: Person) {
    setEditingId(person.id);
    setEditForm({ name: person.name || '', designation: person.designation || '', domain: person.domain || '', photoUrl: person.photoUrl || '', isActive: person.isActive });
  }

  async function saveEdit() {
    if (!editingId) return;
    const res = await apiFetch('/api/v1/users', { method: 'PATCH', body: JSON.stringify({ id: editingId, ...editForm }) });
    const json = await res.json();

    if (!json.success) { setError(json.error || 'Failed to update user'); return; }
    setEditingId(null);
    await loadData();
  }

  async function toggleActive(person: Person) {
    const res = await apiFetch('/api/v1/users', { method: 'PATCH', body: JSON.stringify({ id: person.id, isActive: !person.isActive }) });
    const json = await res.json();
    if (!json.success) { setError(json.error || 'Failed to update status'); return; }
    await loadData();
  }

  async function removePerson(person: Person) {
    const ok = window.confirm(`Delete ${person.name}?`);
    if (!ok) return;

    const res = await apiFetch(`/api/v1/users?id=${person.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) { setError(json.error || 'Failed to delete user'); return; }
    await loadData();
  }

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>
  );

  if (roleOptions.length === 0) return (
    <div className="card p-10 text-center"><AlertCircle className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-base font-semibold text-slate-300">Access unavailable</p><p className="mt-1 text-sm text-slate-400">Only DC Head and Manager accounts can use Access Control.</p></div>
  );

  const canSeeFieldTab = ['SUPER_ADMIN', 'SUPER_BOSS'].includes(user?.role || '');

  return (
    <div className="flex flex-col gap-6 min-h-full">
      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        {error && <div className="flex items-center gap-3 rounded-2xl bg-[#1b2533] p-4 text-sm font-semibold text-red-400 shadow-xl border border-red-900/30 animate-in slide-in-from-right-4"><AlertCircle className="h-5 w-5" />{error}</div>}
        {success && <div className="flex items-center gap-3 rounded-2xl bg-[#1b2533] p-4 text-sm font-semibold text-emerald-400 shadow-xl border border-emerald-900/30 animate-in slide-in-from-right-4"><CheckCircle2 className="h-5 w-5" />{success}</div>}
      </div>

      {/* Tab Switcher */}
      {canSeeFieldTab && (
        <div className="flex items-center gap-1 rounded-2xl bg-[#151c27] p-1.5 border border-[#2d3a4d]/60 w-fit">
          <button
            onClick={() => setActiveTab('org')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'org'
                ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="h-4 w-4" /> Organization Team
          </button>
          <button
            onClick={() => setActiveTab('field')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'field'
                ? 'bg-emerald-600/20 text-emerald-400 shadow-sm border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <MapPin className="h-4 w-4" /> Field Team
          </button>
        </div>
      )}

      {/* ═══════════ FIELD TEAM TAB ═══════════ */}
      {activeTab === 'field' && canSeeFieldTab ? (
        <div className="bg-[#151c27] rounded-3xl border border-[#2d3a4d]/60 p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-500" /> Field Team Management</h2>
              <p className="text-xs text-slate-400 mt-1">{fieldUsers.length} field credentials • Create and manage field user access</p>
            </div>
            <button onClick={() => setIsFieldCreateOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-lg hover:bg-emerald-500 transition">
              <Plus className="h-4 w-4" /> New Field User
            </button>
          </div>

          <div className="rounded-2xl border border-[#2d3a4d] overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-[#111823]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">District</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3a4d]/40">
                {fieldLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                ) : fieldUsers.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No field users created yet. Click "New Field User" to get started.</td></tr>
                ) : fieldUsers.map(fu => (
                  <tr key={fu.id} className="hover:bg-[#1b2533] transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={fu.name} photoUrl={fu.photoUrl} />
                        <p className="font-bold text-slate-100 text-sm">{fu.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{fu.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        fu.role === 'ADMIN' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {fu.role === 'ADMIN' ? 'Admin' : 'Field User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{fu.district?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${fu.isActive ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${fu.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} /> {fu.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition" onClick={() => openFieldEdit(fu)}><Pencil className="h-4 w-4" /></button>
                        <button className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition" onClick={() => toggleActive(fu)}><Power className="h-4 w-4" /></button>
                        <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" onClick={() => removeFieldUser(fu)}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

      /* ═══════════ ORG TEAM TAB ═══════════ */
      <div className="flex w-full flex-col xl:flex-row gap-6 min-h-full">

      {/* Sidebar Workspaces */}
      <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-4 bg-[#151c27] rounded-3xl p-4 border border-[#2d3a4d]/60">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2"><UserPlus className="h-5 w-5 text-indigo-600" /> Workspaces</h2>
          <p className="text-xs text-slate-400 mt-1">Select a manager or direct reports</p>
        </div>

        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center justify-center gap-2 w-full rounded-2xl bg-slate-900 border border-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 hover:shadow-xl">
          <Plus className="h-4 w-4" /> Provision New User
        </button>

        <div className="mt-4 flex flex-col gap-2">
          {directMembers.length > 0 && (
            <button
              onClick={() => setSelectedManagerId('direct')}
              className={`flex items-start gap-4 rounded-2xl p-4 text-left transition ${selectedManagerId === 'direct' ? 'bg-[#1b2533] shadow-soft border border-indigo-100 ring-1 ring-indigo-500/10' : 'hover:bg-[#222f42] border border-transparent'}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#314056] text-slate-400"><Building2 className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate ${selectedManagerId === 'direct' ? 'text-indigo-900' : 'text-slate-300'}`}>Direct Reports</p>
                <p className="text-xs text-slate-400 mt-0.5">{directMembers.length} members mapped</p>
              </div>
            </button>
          )}

          {heads.length > 0 && (
            <div className="mt-2 mb-1 px-2"><p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Administrators</p></div>
          )}
          {heads.map(head => (
            <button
              key={head.id}
              onClick={() => setSelectedManagerId(head.id)}
              className={`flex items-start gap-4 rounded-2xl p-4 text-left transition ${selectedManagerId === head.id ? 'bg-[#1b2533] shadow-soft border border-blue-500/30 ring-1 ring-blue-500/20' : 'hover:bg-[#222f42] border border-transparent'}`}
            >
              <Avatar name={head.name} photoUrl={head.photoUrl} />
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate text-sm ${selectedManagerId === head.id ? 'text-blue-400' : 'text-slate-300'}`}>{head.name}</p>
                <p className="text-[10px] uppercase font-bold text-blue-500/70 mt-1 truncate">DC Head</p>
              </div>
            </button>
          ))}

          {(managers.length > 0) && (
            <div className="mt-2 mb-1 px-2"><p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Managers</p></div>
          )}

          {managers.map(manager => (
            <button
              key={manager.id}
              onClick={() => setSelectedManagerId(manager.id)}
              className={`flex items-start gap-4 rounded-2xl p-4 text-left transition ${selectedManagerId === manager.id ? 'bg-[#1b2533] shadow-soft border border-indigo-100 ring-1 ring-indigo-500/10' : 'hover:bg-[#222f42] border border-transparent'}`}
            >
              <Avatar name={manager.name} photoUrl={manager.photoUrl} />
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate text-sm ${selectedManagerId === manager.id ? 'text-indigo-900' : 'text-slate-300'}`}>{manager.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{manager.designation || 'Manager'}</p>
              </div>
            </button>
          ))}
          
          {managers.length === 0 && directMembers.length === 0 && (
            <div className="text-center p-6 text-sm text-slate-400">No workspaces available</div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#1b2533] rounded-3xl border border-[#2d3a4d]/60 shadow-sm flex flex-col">
        {selectedManagerId === 'direct' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100">Direct Reports</h1>
              <p className="text-sm text-slate-400 mt-1">Users functioning directly under DC Head</p>
            </div>
            
            <div className="flex-1 overflow-auto rounded-3xl border border-[#2d3a4d]">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-[#151c27] sticky top-0 backdrop-blur">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Member</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {directMembers.map(member => (
                    <tr key={member.id} className="hover:bg-[#151c27] transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <Avatar name={member.name} photoUrl={member.photoUrl} />
                          <div>
                            <p className="font-bold text-slate-100">{member.name}</p>
                            <p className="text-xs text-slate-400">{member.designation || 'Team Member'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${member.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} /> {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" onClick={() => openEdit(member)}><Pencil className="h-4 w-4" /></button>
                          <Link href={`/rr?userId=${member.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Briefcase className="h-4 w-4" /></Link>
                          <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" onClick={() => removePerson(member)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {directMembers.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-400">No direct reports found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedManager ? (
           <div className="flex-1 flex flex-col overflow-hidden">
             <div className="p-8 border-b border-[#2d3a4d] bg-[#111823]/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-5">
                    <Avatar name={selectedManager.name} photoUrl={selectedManager.photoUrl} />
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-100">{selectedManager.name}</h1>
                        {!selectedManager.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Inactive</span>}
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">Manager Area</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> {selectedManager.designation || 'Manager'}
                        {selectedManager.domain && <><span className="text-slate-300">|</span> <span>{selectedManager.domain}</span></>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary px-3" onClick={() => openEdit(selectedManager)}><Pencil className="h-4 w-4" /> Edit</button>
                    <Link href={`/rr?userId=${selectedManager.id}`} className="btn-secondary px-3"><Briefcase className="h-4 w-4" /> Matrix</Link>
                    <button className="btn-secondary px-3 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => removePerson(selectedManager)}><Trash2 className="h-4 w-4" /> Delete</button>
                  </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-auto p-8 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Team Members ({selectedManager.children?.length || 0})</h3>
                <div className="rounded-3xl border border-[#2d3a4d] bg-[#1b2533] shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-[#111823]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Member Details</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedManager.children || []).map(member => (
                        <tr key={member.id} className="hover:bg-[#151c27] transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <Avatar name={member.name} photoUrl={member.photoUrl} />
                              <div>
                                <p className="font-bold text-slate-100">{member.name}</p>
                                <p className="text-xs text-slate-400">{member.designation || 'Team Member'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${member.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
                              <div className={`h-1.5 w-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} /> {member.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" onClick={() => openEdit(member)}><Pencil className="h-4 w-4" /></button>
                              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" onClick={() => toggleActive(member)}><Power className="h-4 w-4" /></button>
                              <Link href={`/rr?userId=${member.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Briefcase className="h-4 w-4" /></Link>
                              <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" onClick={() => removePerson(member)}><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(selectedManager.children || []).length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-400">No members mapped.</td></tr>}
                    </tbody>
                  </table>
                </div>
             </div>
           </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Building2 className="h-16 w-16 mb-4 opacity-20" />
            <p>Select a workspace</p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#1b2533] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#2d3a4d] bg-[#151c27]">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Provision New Account</h2>
                <p className="text-sm text-slate-400 mt-1">Fill details to create access</p>
              </div>
              <button className="p-2 -mr-2 text-slate-400 hover:bg-[#1b2533] hover:text-slate-100 rounded-xl transition" onClick={() => setIsCreateModalOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <form id="createForm" onSubmit={handleCreate} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Display Name</label>
                    <div className="relative">
                      <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input required value={form.name} onChange={e => setField('name', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#111823] border border-[#2d3a4d] rounded-2xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition" placeholder="John Doe" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input required type="email" value={form.email} onChange={e => setField('email', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#111823] border border-[#2d3a4d] rounded-2xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition" placeholder="john@dc.com" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
                  <input required value={form.password} onChange={e => setField('password', e.target.value)} className="w-full px-4 py-3 bg-[#111823] border border-[#2d3a4d] rounded-2xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition" placeholder="DC@2026" />
                  <p className="mt-1.5 text-[10px] text-slate-500">User will login with this password</p>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Role Status</label>
                    <select value={form.role} onChange={e => setField('role', e.target.value)} className="w-full px-4 py-3 bg-[#111823] border border-[#2d3a4d] rounded-2xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition appearance-none cursor-pointer">
                      {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Designation</label>
                    <input value={form.designation} onChange={e => setField('designation', e.target.value)} className="w-full px-4 py-3 bg-[#111823] border border-[#2d3a4d] rounded-2xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition" placeholder="ITMS Spec" />
                  </div>
                </div>

                {needsManagerSelection && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Reporting Manager</label>
                    <select value={form.parentId} onChange={e => setField('parentId', e.target.value)} className="w-full px-4 py-3 bg-[#111823] border border-[#2d3a4d] rounded-2xl text-sm text-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition appearance-none cursor-pointer">
                      <option value="">Direct to DC Head</option>
                      {managerOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-[#2d3a4d]">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-base font-bold text-slate-100">Initial Roles</p>
                    <button type="button" onClick={addRR} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition"><Plus className="h-3 w-3" /> Add Item</button>
                  </div>
                  
                  <div className="space-y-4">
                    {rrRows.map((row, idx) => (
                      <div key={idx} className="relative bg-[#111823] border border-[#2d3a4d] p-5 pt-8 rounded-2xl">
                        {rrRows.length > 1 && (
                          <button type="button" onClick={() => removeRR(idx)} className="absolute top-2 right-2 bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 rounded-full p-1.5 transition"><X className="h-3 w-3" /></button>
                        )}
                        <input value={row.title} onChange={e => updateRR(idx, 'title', e.target.value)} className="w-full bg-[#1b2533] border border-[#2d3a4d] rounded-xl px-4 py-2.5 text-sm font-semibold mb-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition" placeholder="Role Category Title" />
                        <textarea value={row.responsibilities} onChange={e => updateRR(idx, 'responsibilities', e.target.value)} rows={2} className="w-full bg-[#1b2533] border border-[#2d3a4d] rounded-xl px-4 py-2.5 text-sm mb-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition resize-none" placeholder="Responsibilities..." />
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-[#2d3a4d] bg-[#111823] flex justify-end gap-3">
              <button type="button" className="px-6 py-3 rounded-2xl text-slate-400 font-bold hover:bg-[#314056] transition" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button type="submit" form="createForm" disabled={saving} className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-lg hover:shadow-xl disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-lg bg-[#1b2533] rounded-[2rem] shadow-2xl p-8">
             <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Edit Details</h2>
                </div>
                <button className="p-2 text-slate-400 hover:bg-[#222f42] hover:text-slate-100 rounded-xl transition" onClick={() => setEditingId(null)}><X className="h-5 w-5" /></button>
             </div>
             <div className="space-y-4">
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 outline-none text-slate-100" placeholder="Name" />
                <input value={editForm.designation} onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 outline-none text-slate-100" placeholder="Designation" />
                <input value={editForm.domain} onChange={e => setEditForm(p => ({ ...p, domain: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 outline-none text-slate-100" placeholder="Domain" />
             </div>
             <div className="mt-8 flex justify-end gap-3">
                <button type="button" className="px-6 py-3 rounded-2xl font-bold text-slate-400 hover:bg-[#222f42]" onClick={() => setEditingId(null)}>Cancel</button>
                <button type="button" className="px-6 py-3 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg" onClick={saveEdit}>Save Changes</button>
             </div>
           </div>
        </div>
      )}
      </div>)}

      {/* ═══════════ Field User Create Modal ═══════════ */}
      {isFieldCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#1b2533] rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#2d3a4d] bg-[#151c27]">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Create Field User</h2>
                <p className="text-sm text-slate-400 mt-1">Credentials for offline dependency dashboard</p>
              </div>
              <button className="p-2 text-slate-400 hover:bg-[#1b2533] hover:text-slate-100 rounded-xl transition" onClick={() => setIsFieldCreateOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleFieldCreate} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Full Name</label>
                <input required value={fieldForm.name} onChange={e => setFieldForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition" placeholder="Field user name" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email</label>
                <input required type="email" value={fieldForm.email} onChange={e => setFieldForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition" placeholder="user@field.com" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
                <input required value={fieldForm.password} onChange={e => setFieldForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition" placeholder="DC@2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Role</label>
                  <select value={fieldForm.role} onChange={e => setFieldForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none appearance-none cursor-pointer">
                    <option value="FIELD_USER">Field User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">District</label>
                  <select value={fieldForm.districtId} onChange={e => setFieldForm(f => ({ ...f, districtId: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none appearance-none cursor-pointer">
                    <option value="">No district</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" className="px-6 py-3 rounded-2xl text-slate-400 font-bold hover:bg-[#314056] transition" onClick={() => setIsFieldCreateOpen(false)}>Cancel</button>
                <button type="submit" disabled={fieldSaving} className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition shadow-lg disabled:opacity-50">
                  {fieldSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ Field User Edit Modal ═══════════ */}
      {editFieldId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#1b2533] rounded-[2rem] shadow-2xl p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">Edit Field User</h2>
              <button className="p-2 text-slate-400 hover:bg-[#222f42] hover:text-slate-100 rounded-xl transition" onClick={() => setEditFieldId(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <input value={editFieldForm.name} onChange={e => setEditFieldForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-[#111823] border border-[#2d3a4d] rounded-2xl px-4 py-3 outline-none text-slate-100" placeholder="Name" />
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm font-medium text-slate-400">Status:</span>
                <button type="button" onClick={() => setEditFieldForm(p => ({ ...p, isActive: !p.isActive }))} className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${editFieldForm.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                  <span className={`inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform ${editFieldForm.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-slate-300">{editFieldForm.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" className="px-6 py-3 rounded-2xl font-bold text-slate-400 hover:bg-[#222f42]" onClick={() => setEditFieldId(null)}>Cancel</button>
              <button type="button" className="px-6 py-3 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg" onClick={saveFieldEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}