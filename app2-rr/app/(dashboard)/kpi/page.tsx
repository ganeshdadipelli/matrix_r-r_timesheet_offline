'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, CheckCircle2, Target } from 'lucide-react';

function parseLines(text: string | null | undefined) {
  return String(text || '')
    .split('\n')
    .map(line => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);
}

function KPIContent() {
  const searchParams = useSearchParams();
  const viewUserId = searchParams.get('userId') || '';
  const sessionUser = getSessionUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = viewUserId ? `/api/v1/rr?userId=${viewUserId}` : '/api/v1/rr';

    apiFetch(url)
      .then(res => res.json())
      .then(json => {
        if (!json.success) {
          setError(json.error || 'Failed to load objective board');
          return;
        }
        setItems(json.data || []);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [viewUserId]);

  const chartData = useMemo(() => {
    return items.map((item: any) => ({
      name: item.title.length > 18 ? `${item.title.slice(0, 18)}...` : item.title,
      objectives: parseLines(item.kpiTargets).length,
      actionPoints: item.actionPoints ? 1 : 0,
    }));
  }, [items]);

  const totals = useMemo(() => {
    const categories = items.length;
    const objectives = items.reduce((sum: number, item: any) => sum + parseLines(item.kpiTargets).length, 0);
    const actionNotes = items.reduce((sum: number, item: any) => sum + (item.actionPoints ? 1 : 0), 0);

    return {
      categories,
      objectives,
      actionNotes,
    };
  }, [items]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-semibold text-red-600">Unable to load objective board</p>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="section-title flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          {viewUserId && viewUserId !== sessionUser?.id ? 'Objective Board' : 'Measurable Objective Board'}
        </h2>
        <p className="section-subtitle">
          This page visually represents how many measurable objectives are defined across R&amp;R categories
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Defined categories</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{totals.categories}</p>
          </div>
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Defined objectives</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{totals.objectives}</p>
          </div>
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Action notes</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{totals.actionNotes}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="card p-6">
          <h3 className="section-title flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            Objective distribution
          </h3>
          <p className="section-subtitle">Category-wise measurable objective count</p>

          <div className="mt-6 h-[340px]">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#111823] text-sm text-slate-400">
                No objective data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="objectives" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Definition readiness
          </h3>
          <p className="section-subtitle">Visual summary of what has been configured</p>

          <div className="mt-6 space-y-4">
            {items.map((item: any) => {
              const objectives = parseLines(item.kpiTargets);

              return (
                <div key={item.id} className="rounded-2xl border border-[#2d3a4d] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-100">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {objectives.length} measurable objectives defined
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Defined
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-[#222f42]">
                    <div
                      className="h-2 rounded-full bg-primary-600"
                      style={{
                        width: `${Math.min(100, Math.max(18, objectives.length * 20))}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {objectives.slice(0, 3).map((objective, idx) => (
                      <span
                        key={`${item.id}-${idx}`}
                        className="rounded-full bg-[#222f42] px-3 py-1 text-xs text-slate-300"
                      >
                        {objective}
                      </span>
                    ))}
                    {objectives.length > 3 && (
                      <span className="rounded-full bg-[#222f42] px-3 py-1 text-xs text-slate-300">
                        + {objectives.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-[#111823] p-8 text-center text-sm text-slate-400">
                No measurable objectives defined yet
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function KPIPage() {
  return (
    <Suspense fallback={<div className="card p-6">Loading...</div>}>
      <KPIContent />
    </Suspense>
  );
}