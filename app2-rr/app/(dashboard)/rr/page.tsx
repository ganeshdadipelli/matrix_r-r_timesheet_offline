'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { FileText, Lightbulb, Pencil, Plus, Save, Trash2, X, ArrowLeft } from 'lucide-react';

type RRItem = {
  id: string;
  title: string;
  responsibilities: string;
  kpiTargets: string;
  actionPoints?: string | null;
  sortOrder: number;
};

type RRForm = {
  title: string;
  responsibilities: string;
  kpiTargets: string;
  actionPoints: string;
};

const EMPTY_FORM: RRForm = {
  title: '',
  responsibilities: '',
  kpiTargets: '',
  actionPoints: '',
};

function parseLines(text: string | null | undefined) {
  return String(text || '')
    .split('\n')
    .map(line => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);
}

export default function RRPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = getSessionUser();
  const targetUserId = searchParams.get('userId') || sessionUser?.id || '';

  const [items, setItems] = useState<RRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState<RRForm>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RRForm>({ ...EMPTY_FORM });

  const canEdit = useMemo(() => {
    if (sessionUser?.role === 'SUPER_ADMIN') return true;
    if (sessionUser?.role === 'TEAM_MEMBER') return false;
    if (targetUserId !== sessionUser?.id) return true;
    if (sessionUser?.role === 'SUPER_BOSS') return true;
    return false; 
  }, [sessionUser, targetUserId]);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/rr?userId=${targetUserId}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to load role matrix');
        return;
      }

      setItems(json.data || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!targetUserId) return;
    loadItems();
  }, [targetUserId]);

  const summary = useMemo(() => {
    return {
      categories: items.length,
      objectives: items.reduce((sum, item) => sum + parseLines(item.kpiTargets).length, 0),
    };
  }, [items]);

  async function createCategory() {
    const res = await apiFetch('/api/v1/rr', {
      method: 'POST',
      body: JSON.stringify({
        userId: targetUserId,
        ...createForm,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      setError(json.error || 'Failed to create category');
      return;
    }

    setCreateForm({ ...EMPTY_FORM });
    await loadItems();
  }

  function openEdit(item: RRItem) {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      responsibilities: item.responsibilities,
      kpiTargets: item.kpiTargets,
      actionPoints: item.actionPoints || '',
    });
  }

  async function saveEdit() {
    if (!editingId) return;

    const item = items.find(x => x.id === editingId);
    if (!item) return;

    const res = await apiFetch('/api/v1/rr', {
      method: 'PUT',
      body: JSON.stringify({
        id: editingId,
        sortOrder: item.sortOrder,
        ...editForm,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      setError(json.error || 'Failed to update category');
      return;
    }

    setEditingId(null);
    await loadItems();
  }

  async function removeCategory(id: string) {
    const ok = window.confirm('Delete this role category?');
    if (!ok) return;

    const res = await apiFetch(`/api/v1/rr?id=${id}`, {
      method: 'DELETE',
    });

    const json = await res.json();

    if (!json.success) {
      setError(json.error || 'Failed to delete category');
      return;
    }

    await loadItems();
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(searchParams.get('userId') || document.referrer.includes('/team') || document.referrer.includes('/dashboard')) && (
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors bg-[#111823] px-4 py-2 w-max rounded-full border border-white/5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}
      <section className="card p-6">
        <h2 className="section-title flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-600" />
          Role Matrix
        </h2>
        <p className="section-subtitle">
          Define, revise, and maintain role ownership and measurable expectations
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Role Categories</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.categories}</p>
          </div>
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">KPI Points</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.objectives}</p>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {canEdit && (
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            <p className="text-base font-bold text-slate-100">Add role category</p>
          </div>

          <div className="grid gap-4">
            <input
              value={createForm.title}
              onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              className="input-field"
              placeholder="Category title"
            />
            <textarea
              rows={4}
              value={createForm.responsibilities}
              onChange={e => setCreateForm(prev => ({ ...prev, responsibilities: e.target.value }))}
              className="input-field resize-none"
              placeholder="Responsibilities"
            />
            <textarea
              rows={4}
              value={createForm.kpiTargets}
              onChange={e => setCreateForm(prev => ({ ...prev, kpiTargets: e.target.value }))}
              className="input-field resize-none"
              placeholder={'• SLA Compliance ≥ 98%\n• Monthly review = 100%'}
            />
            <textarea
              rows={3}
              value={createForm.actionPoints}
              onChange={e => setCreateForm(prev => ({ ...prev, actionPoints: e.target.value }))}
              className="input-field resize-none"
              placeholder="Management note"
            />
            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={createCategory}>
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-2">
        {items.map(item => (
          <div key={item.id} className="card overflow-hidden">
            <div className="border-b border-[#2d3a4d] bg-[#1b2533] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-bold text-slate-100">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">Assigned role definition</p>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button type="button" className="btn-danger" onClick={() => removeCategory(item.id)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Responsibilities
                </p>
                <div className="rounded-3xl border border-[#2d3a4d] bg-[#111823] p-4 text-sm leading-7 text-slate-300 whitespace-pre-line">
                  {item.responsibilities}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-300">
                  KPI Targets
                </p>
                <div className="rounded-3xl border border-primary-200 bg-primary-900 p-4">
                  <div className="space-y-2">
                    {parseLines(item.kpiTargets).map((objective, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="rounded-2xl bg-[#1b2533] px-3 py-2 text-sm text-slate-200 shadow-sm"
                      >
                        {objective}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {item.actionPoints && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Management Note
                  </p>
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900 whitespace-pre-line">
                    {item.actionPoints}
                  </div>
                </div>
              )}

              {editingId === item.id && (
                <div className="space-y-4 rounded-3xl border border-primary-800 bg-primary-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-100">Edit category</p>
                    <button type="button" onClick={() => setEditingId(null)} className="text-slate-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    value={editForm.title}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field"
                    placeholder="Category title"
                  />
                  <textarea
                    rows={4}
                    value={editForm.responsibilities}
                    onChange={e => setEditForm(prev => ({ ...prev, responsibilities: e.target.value }))}
                    className="input-field resize-none"
                    placeholder="Responsibilities"
                  />
                  <textarea
                    rows={4}
                    value={editForm.kpiTargets}
                    onChange={e => setEditForm(prev => ({ ...prev, kpiTargets: e.target.value }))}
                    className="input-field resize-none"
                    placeholder="KPI targets"
                  />
                  <textarea
                    rows={3}
                    value={editForm.actionPoints}
                    onChange={e => setEditForm(prev => ({ ...prev, actionPoints: e.target.value }))}
                    className="input-field resize-none"
                    placeholder="Management note"
                  />

                  <div className="flex gap-2">
                    <button type="button" className="btn-primary" onClick={saveEdit}>
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="card p-10 text-center xl:col-span-2">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-300">No role categories available</p>
            <p className="mt-1 text-sm text-slate-400">
              Add the first role category from the section above
            </p>
          </div>
        )}
      </section>
    </div>
  );
}