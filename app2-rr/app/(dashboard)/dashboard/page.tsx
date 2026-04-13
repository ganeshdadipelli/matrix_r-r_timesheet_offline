'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';

type RRCategory = {
  id: string;
  title: string;
};

type Person = {
  id: string;
  name: string;
  email?: string;
  designation?: string | null;
  domain?: string | null;
  photoUrl?: string | null;
  rrCategories?: RRCategory[];
  children?: Person[];
};

type HeadGroup = Person & {
  managers: Person[];
  directMembers: Person[];
};

type HierarchyData = {
  owner?: Person;
  heads?: HeadGroup[];
  managers?: Person[];
  directMembers?: Person[];
};

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="h-12 w-12 rounded-2xl object-cover" />;
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 font-bold text-white">
      {name.charAt(0)}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openManagers, setOpenManagers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch('/api/v1/hierarchy')
      .then(res => res.json())
      .then(json => {
        if (!json.success) {
          setError(json.error || 'Failed to load executive summary');
          return;
        }
        setData(json.data);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const allManagers = useMemo(() => {
    const direct = data?.managers || [];
    const fromHeads = (data?.heads || []).flatMap(head => head.managers || []);
    return [...direct, ...fromHeads];
  }, [data]);

  const metrics = useMemo(() => {
    const heads = data?.heads || [];
    const managers = allManagers;
    const directMembers = data?.directMembers || [];
    const headMembers = heads.flatMap(head => head.directMembers || []);
    const allMembers =
      managers.reduce((sum, manager) => sum + (manager.children?.length || 0), 0) +
      directMembers.length +
      headMembers.length;

    const rrCount =
      (data?.owner?.rrCategories?.length || 0) +
      heads.reduce((sum, head) => sum + (head.rrCategories?.length || 0), 0) +
      managers.reduce((sum, manager) => sum + (manager.rrCategories?.length || 0), 0) +
      managers.reduce(
        (sum, manager) =>
          sum +
          (manager.children || []).reduce(
            (inner, child) => inner + (child.rrCategories?.length || 0),
            0
          ),
        0
      ) +
      directMembers.reduce((sum, member) => sum + (member.rrCategories?.length || 0), 0) +
      headMembers.reduce((sum, member) => sum + (member.rrCategories?.length || 0), 0);

    return {
      heads: 1 + heads.length,
      managers: managers.length,
      members: allMembers,
      categories: rrCount,
    };
  }, [allManagers, data]);

  function toggleManager(id: string) {
    setOpenManagers(prev => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-semibold text-red-600">Unable to load executive summary</p>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            Executive Summary
          </h2>
          <p className="section-subtitle">
            Parent-child reporting view with responsibilities and role ownership
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card">
            <Building2 className="h-5 w-5 text-primary-600" />
            <p className="mt-4 text-3xl font-bold text-slate-100">{metrics.heads}</p>
            <p className="text-sm text-slate-400">DC Heads</p>
          </div>

          <div className="metric-card">
            <Users className="h-5 w-5 text-manager-700" />
            <p className="mt-4 text-3xl font-bold text-slate-100">{metrics.managers}</p>
            <p className="text-sm text-slate-400">Managers</p>
          </div>

          <div className="metric-card">
            <Briefcase className="h-5 w-5 text-accent-600" />
            <p className="mt-4 text-3xl font-bold text-slate-100">{metrics.members}</p>
            <p className="text-sm text-slate-400">Team Members</p>
          </div>

          <div className="metric-card">
            <FileText className="h-5 w-5 text-primary-300" />
            <p className="mt-4 text-3xl font-bold text-slate-100">{metrics.categories}</p>
            <p className="text-sm text-slate-400">Role Categories</p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-5">
          <p className="text-base font-bold text-slate-100">DC Head Overview</p>
          <p className="text-sm text-slate-400">Leadership layer and direct ownership</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-primary-800 bg-primary-900/30 p-5">
            <div className="flex items-center gap-3">
              <Avatar name={data?.owner?.name || 'DC Head'} photoUrl={data?.owner?.photoUrl} />
              <div>
                <p className="text-lg font-bold text-slate-100">{data?.owner?.name}</p>
                <p className="text-sm text-slate-400">{data?.owner?.designation}</p>
              </div>
            </div>
          </div>

          {(data?.heads || []).map(head => (
            <div key={head.id} className="rounded-3xl border border-primary-800 bg-primary-900/30 p-5">
              <div className="flex items-center gap-3">
                <Avatar name={head.name} photoUrl={head.photoUrl} />
                <div>
                  <p className="text-lg font-bold text-slate-100">{head.name}</p>
                  <p className="text-sm text-slate-400">{head.designation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-5">
          <p className="text-base font-bold text-slate-100">Manager Overview</p>
          <p className="text-sm text-slate-400">
            Click a manager card to view all child team members and assigned role details
          </p>
        </div>

        <div className="space-y-4">
          {allManagers.map(manager => {
            const isOpen = !!openManagers[manager.id];

            return (
              <div key={manager.id} className="rounded-3xl border border-[#2d3a4d] bg-[#1b2533] shadow-sm">
                <div className="flex w-full items-center gap-4 px-5 py-5 text-left bg-[#1b2533] hover:bg-[#111823] transition rounded-3xl">
                  <div className="flex flex-1 min-w-0 items-center gap-4 cursor-pointer" onClick={() => toggleManager(manager.id)}>
                    <Avatar name={manager.name} photoUrl={manager.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-bold text-slate-100">{manager.name}</p>
                        <span className="pill-manager">Manager</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {manager.designation || 'Manager'}
                        {manager.domain ? ` · ${manager.domain}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-[#222f42] px-3 py-1 text-slate-300">
                          {manager.children?.length || 0} members
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pr-2">
                    <Link href={`/rr?userId=${manager.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#2d3a4d] bg-[#222f42] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#314056] z-10">
                      <Briefcase className="h-3.5 w-3.5" /> View Roles ({manager.rrCategories?.length || 0})
                    </Link>
                    <button onClick={() => toggleManager(manager.id)} className="text-slate-400 p-1">
                      {isOpen ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[#2d3a4d] px-5 py-5">
                    <div className="overflow-x-auto rounded-3xl border border-member-100">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th className="table-th">Team Member</th>
                            <th className="table-th">Designation</th>
                            <th className="table-th">Role Categories</th>
                            <th className="table-th text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(manager.children || []).map(member => (
                            <tr key={member.id} className="hover:bg-[#222f42] transition">
                              <td className="table-td">
                                <div className="flex items-center gap-3">
                                  <Avatar name={member.name} photoUrl={member.photoUrl} />
                                  <div>
                                    <p className="font-semibold text-slate-100">{member.name}</p>
                                    <p className="text-xs text-slate-400">{member.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="table-td">{member.designation || 'Team Member'}</td>
                              <td className="table-td font-semibold text-primary-400">{member.rrCategories?.length || 0}</td>
                              <td className="table-td text-right">
                                <Link href={`/rr?userId=${member.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3a4d] bg-[#111823] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#314056] transition"><FileText className="h-3 w-3" /> View Details</Link>
                              </td> 
                            </tr>
                          ))}

                          {(manager.children || []).length === 0 && (
                            <tr>
                              <td className="table-td text-slate-400 text-center" colSpan={4}>
                                No team members mapped to this manager
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}