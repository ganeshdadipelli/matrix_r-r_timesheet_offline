'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Pencil, 
  Plus, 
  Power, 
  Trash2, 
  UserPlus, 
  X, 
  Briefcase, 
  Mail, 
  Building2, 
  UserRound, 
  ArrowRight, 
  Shield 
} from 'lucide-react';

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
  managers?: Person[];
  directMembers?: Person[];
  heads?: Person[];
};

type RRRow = { title: string; responsibilities: string; kpiTargets: string; actionPoints: string; };

const EMPTY_RR: RRRow = { title: '', responsibilities: '', kpiTargets: '', actionPoints: '' };

const ROLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  SUPER_ADMIN: [{ value: 'SUPER_BOSS', label: 'DC Head' }, { value: 'MANAGER', label: 'Manager' }, { value: 'TEAM_LEAD', label: 'Team Lead' }, { value: 'TEAM_MEMBER', label: 'Team Member' }],
  SUPER_BOSS: [{ value: 'SUPER_BOSS', label: 'DC Head' }, { value: 'MANAGER', label: 'Manager' }, { value: 'TEAM_LEAD', label: 'Team Lead' }, { value: 'TEAM_MEMBER', label: 'Team Member' }],
  MANAGER: [{ value: 'TEAM_LEAD', label: 'Team Lead' }, { value: 'TEAM_MEMBER', label: 'Team Member' }],
};

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/10" />;
  }
  return (
    <div className="flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 font-bold text-white ring-2 ring-white/10 uppercase">
      {name.charAt(0)}
    </div>
  );
}

export default function AdminPage() {
  const user = getSessionUser();
  const roleOptions = ROLE_OPTIONS[user?.role || ''] || [];

  /* Org team state */
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [managerOptions, setManagerOptions] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: 'DC@2026', role: 'TEAM_MEMBER', designation: '', domain: '', photoUrl: '', parentId: '', functionalId: '',
  });

  const setField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const [rrRows, setRrRows] = useState<RRRow[]>([{ ...EMPTY_RR }]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', designation: '', domain: '', photoUrl: '', isActive: true, role: '', parentId: '', functionalId: '' });

  const needsManagerSelection = useMemo(() => {
    return ['SUPER_ADMIN', 'SUPER_BOSS'].includes(user?.role || '');
  }, [user?.role]);

  async function loadData() {
    setLoading(true);
    try {
      const [hierarchyRes, usersRes] = await Promise.all([
        apiFetch('/api/v1/hierarchy'), 
        apiFetch('/api/v1/users?role=MANAGER,SUPER_BOSS,TEAM_LEAD')
      ]);
      const hierarchyJson = await hierarchyRes.json();
      const usersJson = await usersRes.json();

      if (hierarchyJson.success) {
        setHierarchy(hierarchyJson.data);
        if (!selectedManagerId) {
           if (hierarchyJson.data.type === 'manager' && hierarchyJson.data.self) {
             setSelectedManagerId(hierarchyJson.data.self.id);
           } else if (hierarchyJson.data.owner) {
             setSelectedManagerId(hierarchyJson.data.owner.id);
           } else if (hierarchyJson.data.roots?.length > 0) {
             setSelectedManagerId(hierarchyJson.data.roots[0].owner.id);
           }
        }
      }
      if (usersJson.success) setManagerOptions(usersJson.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  /* Unified list of selectable workspaces (Roots, Managers, Sub-Heads) */
  const selectableWorkspaces = useMemo(() => {
    if (!hierarchy) return [];
    
    // For hierarchy type, we collect all owners of roots and all managers/heads within them
    if (hierarchy.type === 'hierarchy') {
      const roots = hierarchy.roots || (hierarchy.owner ? [hierarchy] : []);
      const pool: Person[] = [];
      const seen = new Set<string>();

      roots.forEach((r: any) => {
        const owner = r.owner;
        if (owner && !seen.has(owner.id)) {
          pool.push({ ...owner, children: [...(r.managers || []), ...(r.heads || []), ...(r.directMembers || [])] });
          seen.add(owner.id);
        }
        
        // Add sub-heads and managers as independent selectable workspaces
        r.heads?.forEach((h: any) => {
          if (!seen.has(h.id)) {
            pool.push({ ...h, children: [...(h.managers || []), ...(h.directMembers || [])] });
            seen.add(h.id);
          }
        });

        r.managers?.forEach((m: any) => {
          if (!seen.has(m.id)) {
            pool.push({ ...m, children: (m.children || []) });
            seen.add(m.id);
          }
        });
      });
      return pool;
    }

    if (hierarchy.type === 'manager') {
      return [{ ...hierarchy.self, children: hierarchy.team || [] }];
    }

    return [];
  }, [hierarchy]);

  const currentWorkspace = useMemo(() => {
    return selectableWorkspaces.find(w => w.id === selectedManagerId) || selectableWorkspaces[0] || null;
  }, [selectedManagerId, selectableWorkspaces]);

  const workspaceMembers = useMemo(() => {
    if (!currentWorkspace) return [];
    return currentWorkspace.children || [];
  }, [currentWorkspace]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const validRRs = rrRows.filter(row => row.title.trim() && row.responsibilities.trim());
      const res = await apiFetch('/api/v1/users', { 
        method: 'POST', 
        body: JSON.stringify({ 
          ...form, 
          parentId: form.parentId || null, 
          rrCategories: validRRs 
        }) 
      });
      const json = await res.json();

      if (!json.success) { setError(json.error || 'Failed to create user'); return; }

      setSuccess(`${form.name} created successfully.`);
      setIsCreateModalOpen(false);
      setForm({ name: '', email: '', password: 'DC@2026', role: roleOptions[0]?.value || 'TEAM_MEMBER', designation: '', domain: '', photoUrl: '', parentId: '', functionalId: '' });
      setRrRows([{ ...EMPTY_RR }]);
      await loadData();
    } catch {
      setError('Server connection failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    const res = await apiFetch('/api/v1/users', { 
      method: 'PATCH', 
      body: JSON.stringify({ id: editingId, ...editForm }) 
    });
    const json = await res.json();
    if (!json.success) { setError(json.error || 'Failed to update user'); return; }
    setEditingId(null);
    await loadData();
  }

  async function removePerson(person: Person) {
    if (!window.confirm(`Delete ${person.name}?`)) return;
    const res = await apiFetch(`/api/v1/users?id=${person.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) { setError(json.error || 'Failed to delete user'); return; }
    await loadData();
  }

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notifications */}
      {error && <div className="fixed top-6 right-6 z-[200] rounded-2xl bg-red-900/90 border border-red-500/50 p-4 text-white font-bold backdrop-blur shadow-2xl animate-in slide-in-from-right-4">{error}</div>}
      {success && <div className="fixed top-6 right-6 z-[200] rounded-2xl bg-emerald-900/90 border border-emerald-500/50 p-4 text-white font-bold backdrop-blur shadow-2xl animate-in slide-in-from-right-4">{success}</div>}

      <div className="flex w-full flex-col xl:flex-row gap-6">
        
        {/* Workspace Selector Sidebar */}
        <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-4 bg-[#151c27] rounded-3xl p-5 border border-[#2d3a4d]/60 shadow-lg">
          <div className="mb-2">
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-500" /> Workspaces
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Select a leader to manage their team</p>
          </div>

          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl transition-all hover:bg-indigo-500 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Provision New User
          </button>

          <div className="mt-4 flex flex-col gap-2 max-h-[600px] overflow-auto custom-scrollbar pr-1">
            <p className="text-[10px] font-black tracking-[.2em] text-slate-500 uppercase px-2 mb-1">Administrative Units</p>
            {selectableWorkspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => setSelectedManagerId(ws.id)}
                className={`flex items-start gap-4 rounded-2xl p-4 text-left border transition-all ${
                  selectedManagerId === ws.id 
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[inset_0_0_12px_rgba(99,102,241,0.1)]' 
                    : 'bg-[#1b2533] border-transparent hover:bg-[#222f42] hover:border-white/5'
                }`}
              >
                <Avatar name={ws.name} photoUrl={ws.photoUrl} />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-[13px] ${selectedManagerId === ws.id ? 'text-indigo-400' : 'text-slate-200'}`}>{ws.name}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mt-1 truncate">
                    {['MANAGER', 'TEAM_LEAD'].includes(ws.role) ? `${ws.role.replace('_', ' ')} - ${ws.designation || 'Unit Head'}` : (ws.designation || ws.role)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Team Table */}
        <div className="flex-1 bg-[#1b2533] rounded-[2rem] border border-[#2d3a4d]/60 shadow-2xl flex flex-col overflow-hidden min-h-[700px]">
          {currentWorkspace ? (
            <div className="flex-1 flex flex-col">
              <div className="p-8 border-b border-[#2d3a4d] bg-[#111823]/30">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
                    <div className="flex items-center gap-5">
                      <Avatar name={currentWorkspace.name} photoUrl={currentWorkspace.photoUrl} />
                      <div>
                        <div className="flex items-center gap-3">
                          <h1 className="text-2xl font-black text-white tracking-tight leading-none">{currentWorkspace.name}</h1>
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${currentWorkspace.role === 'SUPER_BOSS' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'}`}>
                            {currentWorkspace.role === 'SUPER_BOSS' ? 'DC Head' : currentWorkspace.role.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400 flex items-center gap-2 font-bold uppercase tracking-wide">
                          <Briefcase className="h-4 w-4 text-indigo-500" /> {currentWorkspace.designation || 'Leader'}
                        </p>
                      </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition" onClick={() => {
                          setEditingId(currentWorkspace.id);
                          setEditForm({
                            name: currentWorkspace.name,
                            email: currentWorkspace.email,
                            password: '',
                            designation: currentWorkspace.designation || '',
                            domain: currentWorkspace.domain || '',
                            photoUrl: currentWorkspace.photoUrl || '',
                            isActive: currentWorkspace.isActive,
                            role: currentWorkspace.role,
                            parentId: currentWorkspace.parentId || '',
                            functionalId: (currentWorkspace as any).functionalId || '',
                          });
                        }}><Pencil className="h-4 w-4" /> Edit</button>
                        <Link href={`/rr?userId=${currentWorkspace.id}`} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition"><Shield className="h-4 w-4" /> Matrix</Link>
                        <button className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition" onClick={() => removePerson(currentWorkspace)}><Trash2 className="h-4 w-4" /> Delete</button>
                     </div>
                 </div>
              </div>

              <div className="flex-1 p-8 overflow-auto">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-[11px] font-black tracking-[0.2em] text-slate-500 uppercase">Team Members ({workspaceMembers.length})</h3>
                </div>
                
                <div className="rounded-3xl border border-[#2d3a4d] bg-[#151c27]/40 overflow-hidden">
                   <table className="w-full text-left">
                     <thead className="bg-[#111823] border-b border-[#2d3a4d]">
                       <tr>
                         <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Member Identity</th>
                         <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Status</th>
                         <th className="px-6 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Gear</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-[#2d3a4d]/30">
                       {workspaceMembers.map(member => (
                         <tr key={member.id} className="hover:bg-indigo-600/5 transition-colors group">
                           <td className="px-6 py-5">
                             <div className="flex items-center gap-4">
                               <Avatar name={member.name} photoUrl={member.photoUrl} />
                               <div>
                                 <p className="font-bold text-slate-100 text-sm group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{member.name}</p>
                                 <p className="text-[11px] text-slate-500 font-bold uppercase mt-0.5">{member.designation || member.role}</p>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-5">
                             <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${member.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                               <div className={`h-1.5 w-1.5 rounded-full ${member.isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} /> {member.isActive ? 'Active' : 'Standby'}
                             </span>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition" onClick={() => {
                                   setEditingId(member.id);
                                   setEditForm({
                                     name: member.name,
                                     email: member.email,
                                     password: '',
                                     designation: member.designation || '',
                                     domain: member.domain || '',
                                     photoUrl: member.photoUrl || '',
                                     isActive: member.isActive,
                                     role: member.role,
                                     parentId: member.parentId || '',
                                     functionalId: (member as any).functionalId || '',
                                   });
                                 }} title="Update Details"><Pencil className="h-4 w-4" /></button>
                                <Link href={`/rr?userId=${member.id}`} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition" title="View Responsibilities"><Shield className="h-4 w-4" /></Link>
                                <button className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition" onClick={() => removePerson(member)} title="De-provision"><Trash2 className="h-4 w-4" /></button>
                              </div>
                           </td>
                         </tr>
                       ))}
                       {workspaceMembers.length === 0 && (
                         <tr><td colSpan={3} className="px-6 py-20 text-center text-sm font-bold text-slate-500 italic">No subordinates linked to this workspace unit.</td></tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-20 py-20">
               <Shield className="h-32 w-32 mb-6" />
               <p className="text-2xl font-black uppercase tracking-widest">System Ready</p>
               <p className="mt-2 text-sm">Synchronized Organizational Framework Active</p>
            </div>
          )}
        </div>
      </div>

      {/* Provisioning Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="w-full max-w-4xl bg-[#0b111a] rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-900/10 to-transparent">
                 <div>
                   <h2 className="text-2xl font-black text-white tracking-tight uppercase">Provisioning Deck</h2>
                   <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Deploy new credentials to the hierarchy</p>
                 </div>
                 <button onClick={() => setIsCreateModalOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition"><X className="h-6 w-6" /></button>
              </div>

              <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                 <form id="createForm" onSubmit={handleCreate} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity Name</label>
                          <input required value={form.name} onChange={e => setField('name', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition" placeholder="John Doe" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Email</label>
                          <input required type="email" value={form.email} onChange={e => setField('email', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition" placeholder="j.doe@matrix.com" />
                       </div>
                    </div>

                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Tier (Role)</label>
                           <select value={form.role} onChange={e => setField('role', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-white/5 rounded-2xl text-white outline-none appearance-none cursor-pointer focus:border-indigo-500/50">
                              {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Credentials (Initial Password)</label>
                           <input type="text" value={form.password} onChange={e => setField('password', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/50 transition" placeholder="DC@2026" />
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Function/Designation</label>
                           <input value={form.designation} onChange={e => setField('designation', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/50 transition" placeholder="Lead Architect" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Domain</label>
                           <input value={form.domain} onChange={e => setField('domain', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/50 transition" placeholder="Applications / Infrastructure" />
                        </div>
                     </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Direct Reporting Manager</label>
                         <select value={form.parentId} onChange={e => setField('parentId', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-white/5 rounded-2xl text-white outline-none appearance-none cursor-pointer focus:border-indigo-500/50">
                            <option value="">{form.role === 'SUPER_BOSS' ? 'Global Root (No Superiors)' : 'Assign Reporting Authority...'}</option>
                            {managerOptions.map(m => (
                              <option key={m.id} value={m.id}>{m.role === 'SUPER_BOSS' ? `[Head] ${m.name}` : m.name}</option>
                            ))}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Functional DC Head (Optional)</label>
                          <select value={form.functionalId} onChange={e => setField('functionalId', e.target.value)} className="w-full px-5 py-4 bg-[#111823] border border-amber-500/10 rounded-2xl text-white outline-none appearance-none cursor-pointer focus:border-indigo-500/50">
                             <option value="">No Functional Reporting</option>
                             {managerOptions.filter(m => m.role === 'SUPER_BOSS' || m.role === 'MANAGER').map(m => (
                               <option key={m.id} value={m.id}>{m.name} ({m.role === 'SUPER_BOSS' ? 'DC Head' : 'Manager'})</option>
                             ))}
                          </select>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6">
                       <div className="flex items-center justify-between px-1">
                          <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Initial Matrix Bindings</h4>
                          <button type="button" onClick={() => setRrRows([...rrRows, {...EMPTY_RR}])} className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-[10px] font-black text-indigo-400 hover:bg-indigo-500/20 transition uppercase">+ Add Responsibility Layer</button>
                       </div>
                       <div className="grid gap-4">
                          {rrRows.map((row, idx) => (
                            <div key={idx} className="bg-[#111823] p-6 rounded-[2rem] border border-white/5 relative group transition-all hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5">
                               {rrRows.length > 1 && (
                                 <button type="button" onClick={() => setRrRows(rrRows.filter((_, i) => i !== idx))} className="absolute top-6 right-6 p-2 rounded-full bg-red-500/5 text-red-500 opacity-0 group-hover:opacity-100 transition hover:bg-red-500/20">
                                   <X className="h-4 w-4" />
                                 </button>
                               )}
                               <div className="flex items-center gap-3 mb-4">
                                 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-[10px] font-black text-indigo-400 border border-indigo-500/20">{idx + 1}</div>
                                 <input value={row.title} onChange={e => { const n = [...rrRows]; n[idx].title = e.target.value; setRrRows(n); }} className="flex-1 bg-transparent border-none text-white font-black text-base focus:ring-0 p-0 placeholder:text-slate-600" placeholder="Responsibility Title (e.g. Infrastructure Maintenance)" />
                               </div>
                               <div className="grid md:grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Core Responsibilities</label>
                                   <textarea value={row.responsibilities} onChange={e => { const n = [...rrRows]; n[idx].responsibilities = e.target.value; setRrRows(n); }} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-slate-300 text-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition resize-none" rows={3} placeholder="Describe the specific duties and scope..." />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">KPI Targets & Metrics</label>
                                   <textarea value={row.kpiTargets} onChange={e => { const n = [...rrRows]; n[idx].kpiTargets = e.target.value; setRrRows(n); }} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-slate-300 text-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition resize-none" rows={3} placeholder="e.g. 99.9% Uptime, Zero major incidents..." />
                                 </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </form>
              </div>

              <div className="p-8 border-t border-white/5 bg-slate-900/10 flex justify-end gap-3">
                 <button onClick={() => setIsCreateModalOpen(false)} className="px-8 py-3.5 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-white/5 transition">Cancel</button>
                 <button type="submit" form="createForm" disabled={saving} className="px-10 py-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition disabled:opacity-50">
                   {saving ? 'Processing...' : 'Deploy Credentials'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal */}
       {editingId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="w-full max-w-xl bg-[#0b111a] rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-900/10 to-transparent">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Sync Identity</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Modify user credentials and reporting lines</p>
                </div>
                <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition"><X className="h-6 w-6" /></button>
              </div>

              <div className="flex-1 overflow-auto p-8 custom-scrollbar space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                       <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500/50" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Email</label>
                       <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500/50" />
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Function / Designation</label>
                       <input value={editForm.designation} onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500/50" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password (Leave blank to keep same)</label>
                       <input type="text" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500/50" placeholder="••••••••" />
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Domain</label>
                       <input value={editForm.domain} onChange={e => setEditForm(p => ({ ...p, domain: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500/50" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Avatar Photo URL</label>
                       <input value={editForm.photoUrl} onChange={e => setEditForm(p => ({ ...p, photoUrl: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500/50" placeholder="https://..." />
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reporting Manager</label>
                      <select value={editForm.parentId} onChange={e => setEditForm(p => ({ ...p, parentId: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none appearance-none cursor-pointer focus:border-indigo-500/50">
                         <option value="">Primary Root (No Manager)</option>
                         {managerOptions.filter(m => m.id !== editingId).map(m => (
                           <option key={m.id} value={m.id}>{m.role === 'SUPER_BOSS' ? `[Head] ${m.name}` : m.name}</option>
                         ))}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Functional DC Head</label>
                          <select value={editForm.functionalId} onChange={e => setEditForm(p => ({ ...p, functionalId: e.target.value }))} className="w-full bg-[#111823] border border-amber-500/10 rounded-2xl px-5 py-4 text-white outline-none appearance-none cursor-pointer focus:border-indigo-500/50">
                             <option value="">No Functional Reporting</option>
                             {managerOptions.filter(m => (m.role === 'SUPER_BOSS' || m.role === 'MANAGER') && m.id !== editingId).map(m => (
                               <option key={m.id} value={m.id}>{m.name} ({m.role === 'SUPER_BOSS' ? 'DC Head' : 'Manager'})</option>
                             ))}
                          </select>
                   </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Level (Role)</label>
                     <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} className="w-full bg-[#111823] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none appearance-none cursor-pointer focus:border-indigo-500/50">
                        <option value="SUPER_BOSS">DC Head</option>
                        <option value="MANAGER">Manager</option>
                        <option value="TEAM_LEAD">Team Lead</option>
                        <option value="TEAM_MEMBER">Team Member</option>
                     </select>
                 </div>

                 <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/5 mt-6">
                    <div>
                      <span className="text-sm font-black text-white uppercase tracking-tight">Account Active</span>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Enable or disable system access</p>
                    </div>
                    <button onClick={() => setEditForm(p => ({ ...p, isActive: !p.isActive }))} className={`w-14 h-7 rounded-full transition-all relative ${editForm.isActive ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-700'}`}>
                       <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${editForm.isActive ? 'left-8' : 'left-1'}`} />
                    </button>
                 </div>
              </div>

              <div className="p-8 border-t border-white/5 flex justify-end gap-3 bg-slate-900/10">
                 <button onClick={() => setEditingId(null)} className="px-8 py-3.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-white/5 rounded-2xl transition">Abort</button>
                 <button onClick={saveEdit} className="px-10 py-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition shadow-xl shadow-indigo-500/20">Commit Changes</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}