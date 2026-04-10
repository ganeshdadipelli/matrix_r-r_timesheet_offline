'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { Briefcase, Expand, Eye, EyeOff, FileText, GitBranch, Minus, Plus, RotateCcw, Users, X } from 'lucide-react';

type RRCategory = {
  id: string;
  title: string;
  responsibilities: string;
  kpiTargets: string;
  actionPoints?: string | null;
};

type PersonNode = {
  id: string;
  name: string;
  designation?: string | null;
  domain?: string | null;
  photoUrl?: string | null;
  rrCategories?: RRCategory[];
  children?: PersonNode[];
};

type HierarchyData = {
  type: 'self' | 'manager' | 'hierarchy';
  owner?: PersonNode;
  user?: PersonNode;
  self?: PersonNode;
  team?: PersonNode[];
  managers?: PersonNode[];
  directMembers?: PersonNode[];
};

type PreviewNode = {
  id: string;
  name: string;
  designation?: string | null;
  roleLabel: 'DC Head' | 'Manager' | 'Team Member';
  color: 'head' | 'manager' | 'member';
  rrCategories: RRCategory[];
  memberCount?: number;
};

function trimText(text: string, max = 28) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function TeamPage() {
  const sessionUser = getSessionUser();
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preview, setPreview] = useState<PreviewNode | null>(null);

  const [showMembers, setShowMembers] = useState(true);
  const [scale, setScale] = useState(0.92);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [previewPos, setPreviewPos] = useState({ x: -20, y: 80 });
  const [previewDragging, setPreviewDragging] = useState(false);
  const previewDragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  useEffect(() => {
    apiFetch('/api/v1/hierarchy')
      .then(res => res.json())
      .then(json => {
        if (!json.success) {
          setError(json.error || 'Failed to load hierarchy');
          return;
        }
        setData(json.data);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!preview) return;
    const timer = window.setTimeout(() => setPreview(null), 10000);
    return () => window.clearTimeout(timer);
  }, [preview]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging) return;

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    }

    function onMovePreview(e: MouseEvent) {
      if (!previewDragging) return;
      const dx = e.clientX - previewDragStart.current.x;
      const dy = e.clientY - previewDragStart.current.y;
      setPreviewPos({
        x: previewDragStart.current.startX + dx,
        y: previewDragStart.current.startY + dy,
      });
    }

    function onUp() {
      setDragging(false);
    }

    function onUpPreview() {
      setPreviewDragging(false);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMovePreview);
    window.addEventListener('mouseup', onUpPreview);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMovePreview);
      window.removeEventListener('mouseup', onUpPreview);
    };
  }, [dragging, previewDragging]);

  const owner: any = data?.owner || data?.self || data?.user || sessionUser;
  const managers = data?.managers || [];
  const directMembers = data?.directMembers || [];

  const metrics = useMemo(() => {
    const managerCount = managers.length;
    const memberCount =
      managers.reduce((sum: number, manager: any) => sum + (manager.children?.length || 0), 0) +
      directMembers.length;

    const rrCount =
      (owner?.rrCategories?.length || 0) +
      managers.reduce((sum: number, manager: any) => sum + (manager.rrCategories?.length || 0), 0) +
      managers.reduce(
        (sum: number, manager: any) =>
          sum +
          (manager.children || []).reduce(
            (inner: number, child: any) => inner + (child.rrCategories?.length || 0),
            0
          ),
        0
      ) +
      directMembers.reduce((sum: number, member: any) => sum + (member.rrCategories?.length || 0), 0);

    return {
      managerCount,
      memberCount,
      rrCount,
      reportingUnits: managerCount + directMembers.length,
    };
  }, [directMembers, managers, owner]);

  const graph = useMemo(() => {
    const baseHeight = 820;
    let currentY = 100;

    const managerLayouts = managers.map((manager: any) => {
      const members = showMembers ? (manager.children || []) : [];
      const membersHeight = Math.max(150, members.length * 88);
      const groupHeight = Math.max(180, membersHeight);
      const managerY = currentY + groupHeight / 2;

      const memberLayouts = members.map((member: any, idx: number) => ({
        ...member,
        x: 1030,
        y: currentY + 54 + idx * 88,
      }));

      const layout = {
        ...manager,
        x: 525,
        y: managerY,
        members: memberLayouts,
      };

      currentY += groupHeight + 42;
      return layout;
    });

    const directStartY = currentY + 40;

    const directMembersList = showMembers ? directMembers : [];
    const directLayouts = directMembersList.map((member: any, idx: number) => ({
      ...member,
      x: 760,
      y: directStartY + idx * 88,
    }));

    const height = Math.max(baseHeight, directStartY + directLayouts.length * 88 + 120);

    return {
      width: 1450,
      height,
      root: {
        x: 90,
        y: height / 2,
      },
      managers: managerLayouts,
      directMembers: directLayouts,
    };
  }, [managers, directMembers, showMembers]);

  function showPreview(node: PreviewNode) {
    setPreview(node);
    setPreviewPos({ x: -20, y: 80 }); // Reset position on new preview
  }

  function handlePreviewMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setPreviewDragging(true);
    previewDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startX: previewPos.x,
      startY: previewPos.y,
    };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
  e.preventDefault();

  const rect = e.currentTarget.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? -0.015 : 0.015;

  setScale(prevScale => {
    const nextScale = Math.min(1.5, Math.max(0.65, prevScale + delta));

    const worldX = (cursorX - pan.x) / prevScale;
    const worldY = (cursorY - pan.y) / prevScale;

    const nextPanX = cursorX - worldX * nextScale;
    const nextPanY = cursorY - worldY * nextScale;

    setPan({ x: nextPanX, y: nextPanY });
    return nextScale;
  });
}

function zoomIn() {
  setScale(prev => Math.min(1.5, prev + 0.03));
}

function zoomOut() {
  setScale(prev => Math.max(0.65, prev - 0.03));
}

  function resetView() {
    setScale(0.92);
    setPan({ x: 0, y: 0 });
  }

  async function openFullscreen() {
    const el = stageRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await el.requestFullscreen();
  }

  function openRoleMatrix(userId: string) {
    window.location.href = `/rr?userId=${userId}`;
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
        <p className="text-lg font-semibold text-red-600">Unable to load organization map</p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary-600" />
            Organization Map
          </h2>
          <p className="section-subtitle">Reporting structure and role allocation snapshot</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card">
            <GitBranch className="h-5 w-5 text-primary-600" />
            <p className="mt-4 text-3xl font-bold text-slate-900">{metrics.reportingUnits}</p>
            <p className="text-sm text-slate-500">Reporting Units</p>
          </div>

          <div className="metric-card">
            <Users className="h-5 w-5 text-manager-700" />
            <p className="mt-4 text-3xl font-bold text-slate-900">{metrics.managerCount}</p>
            <p className="text-sm text-slate-500">Managers</p>
          </div>

          <div className="metric-card">
            <Briefcase className="h-5 w-5 text-accent-600" />
            <p className="mt-4 text-3xl font-bold text-slate-900">{metrics.memberCount}</p>
            <p className="text-sm text-slate-500">Team Members</p>
          </div>

          <div className="metric-card">
            <FileText className="h-5 w-5 text-primary-700" />
            <p className="mt-4 text-3xl font-bold text-slate-900">{metrics.rrCount}</p>
            <p className="text-sm text-slate-500">Assigned Role Categories</p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="section-title">Interactive Map</h3>
            <p className="section-subtitle">Drag, zoom, and inspect hierarchy nodes</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowMembers(p => !p)}>
              {!showMembers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showMembers ? 'Hide Members' : 'Show Members'}
            </button>
            <button type="button" className="btn-secondary" onClick={zoomOut}>
              <Minus className="h-4 w-4" />
              Zoom Out
            </button>
            <button type="button" className="btn-secondary" onClick={zoomIn}>
              <Plus className="h-4 w-4" />
              Zoom In
            </button>
            <button type="button" className="btn-secondary" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
              Reset View
            </button>
            <button type="button" className="btn-secondary" onClick={openFullscreen}>
              <Expand className="h-4 w-4" />
              Full Screen
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          className="org-map-stage relative mt-6 overflow-hidden rounded-3xl border border-primary-100 bg-slate-950"
        >
          <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
            <span className="pill-head">DC Head</span>
            <span className="pill-manager">Manager</span>
            <span className="pill-member">Team Member</span>
          </div>

          <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-2xl bg-[#0b111a]/80 p-1.5 backdrop-blur-md border border-white/10 shadow-xl">
            <button
              type="button"
              className={`rounded-xl p-2 transition hover:bg-white/10 hover:text-white ${!showMembers ? 'text-primary-400' : 'text-slate-400'}`}
              onClick={() => setShowMembers(prev => !prev)}
              title="Toggle Members"
            >
              {!showMembers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button type="button" className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={zoomOut}>
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={zoomIn}>
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-xl p-2 bg-white/5 text-slate-300 transition hover:bg-white/15" onClick={openFullscreen}>
              <Expand className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`org-map-canvas h-[82vh] min-h-[680px] w-full overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                transition: dragging ? 'none' : 'transform 80ms ease',
              }}
            >
              <svg
                viewBox={`0 0 ${graph.width} ${graph.height}`}
                className="min-w-[1250px]"
                style={{ width: graph.width, height: graph.height }}
              >
                <defs>
                  <linearGradient id="rootGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>

                  <linearGradient id="managerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>

                  <linearGradient id="memberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0891b2" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>

                  <filter id="glow">
                    <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#356dff" floodOpacity="0.22" />
                  </filter>
                </defs>

                {graph.managers.map((manager: any) => (
                  <path
                    key={`root-${manager.id}`}
                    d={`M ${graph.root.x + 220} ${graph.root.y}
                        C 315 ${graph.root.y}, 360 ${manager.y}, ${manager.x - 18} ${manager.y}`}
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="3.2"
                    strokeOpacity="0.95"
                  />
                ))}

                {graph.managers.flatMap((manager: any) =>
                  manager.members.map((member: any) => (
                    <path
                      key={`${manager.id}-${member.id}`}
                      d={`M ${manager.x + 285} ${manager.y}
                          C 800 ${manager.y}, 860 ${member.y}, ${member.x - 18} ${member.y}`}
                      fill="none"
                      stroke="#67e8f9"
                      strokeWidth="2.5"
                      strokeOpacity="0.92"
                    />
                  ))
                )}

                {graph.directMembers.map((member: any) => (
                  <path
                    key={`direct-${member.id}`}
                    d={`M ${graph.root.x + 220} ${graph.root.y}
                        C 430 ${graph.root.y}, 520 ${member.y}, ${member.x - 18} ${member.y}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.6"
                    strokeOpacity="0.92"
                  />
                ))}

                <g
                  onClick={() =>
                    showPreview({
                      id: owner?.id || 'root',
                      name: owner?.name || 'DC Head',
                      designation: owner?.designation || 'DC Head',
                      roleLabel: 'DC Head',
                      rrCategories: owner?.rrCategories || [],
                      memberCount: managers.length + directMembers.length,
                      color: 'head',
                    })
                  }
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={graph.root.x}
                    y={graph.root.y - 64}
                    rx="30"
                    width="220"
                    height="128"
                    fill="url(#rootGrad)"
                    filter="url(#glow)"
                  />
                  <text x={graph.root.x + 18} y={graph.root.y - 12} fill="#fff" fontSize="16" fontWeight="700">
                    {trimText(owner?.name || 'DC Head', 24)}
                  </text>
                  <text x={graph.root.x + 18} y={graph.root.y + 14} fill="#dbeafe" fontSize="12">
                    {trimText(owner?.designation || 'DC Head', 30)}
                  </text>
                  <text x={graph.root.x + 18} y={graph.root.y + 38} fill="#e0f2fe" fontSize="11">
                    DC Head
                  </text>
                </g>

                {graph.managers.map((manager: any) => (
                  <g
                    key={manager.id}
                    onClick={() =>
                      showPreview({
                        id: manager.id,
                        name: manager.name,
                        designation: manager.designation,
                        roleLabel: 'Manager',
                        rrCategories: manager.rrCategories || [],
                        memberCount: manager.children?.length || 0,
                        color: 'manager',
                      })
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={manager.x}
                      y={manager.y - 50}
                      rx="24"
                      width="285"
                      height="100"
                      fill="url(#managerGrad)"
                      filter="url(#glow)"
                    />
                    <text x={manager.x + 16} y={manager.y - 10} fill="#fff" fontSize="14" fontWeight="700">
                      {trimText(manager.name, 29)}
                    </text>
                    <text x={manager.x + 16} y={manager.y + 14} fill="#dbeafe" fontSize="12">
                      {trimText(manager.designation || 'Manager', 34)}
                    </text>
                    <text x={manager.x + 16} y={manager.y + 36} fill="#e0f2fe" fontSize="11">
                      {`${manager.children?.length || 0} members`}
                    </text>
                  </g>
                ))}

                {graph.managers.flatMap((manager: any) =>
                  manager.members.map((member: any) => (
                    <g
                      key={member.id}
                      onClick={() =>
                        showPreview({
                          id: member.id,
                          name: member.name,
                          designation: member.designation,
                          roleLabel: 'Team Member',
                          rrCategories: member.rrCategories || [],
                          color: 'member',
                        })
                      }
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={member.x}
                        y={member.y - 36}
                        rx="22"
                        width="260"
                        height="72"
                        fill="url(#memberGrad)"
                        opacity="0.98"
                      />
                      <text x={member.x + 14} y={member.y - 4} fill="#fff" fontSize="13" fontWeight="700">
                        {trimText(member.name, 29)}
                      </text>
                      <text x={member.x + 14} y={member.y + 18} fill="#cffafe" fontSize="11">
                        {trimText(member.designation || 'Team Member', 32)}
                      </text>
                    </g>
                  ))
                )}

                {graph.directMembers.map((member: any) => (
                  <g
                    key={member.id}
                    onClick={() =>
                      showPreview({
                        id: member.id,
                        name: member.name,
                        designation: member.designation,
                        roleLabel: 'Team Member',
                        rrCategories: member.rrCategories || [],
                        color: 'member',
                      })
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={member.x}
                      y={member.y - 36}
                      rx="22"
                      width="260"
                      height="72"
                      fill="url(#memberGrad)"
                      opacity="0.98"
                    />
                    <text x={member.x + 14} y={member.y - 4} fill="#fff" fontSize="13" fontWeight="700">
                      {trimText(member.name, 29)}
                    </text>
                    <text x={member.x + 14} y={member.y + 18} fill="#cffafe" fontSize="11">
                      {trimText(member.designation || 'Team Member', 32)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {preview && (
            <div
              className={`absolute right-0 top-0 z-50 w-[380px] rounded-3xl border border-white/10 bg-[#0b111a]/95 p-5 shadow-2xl backdrop-blur-xl ${previewDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ transform: `translate(${previewPos.x}px, ${previewPos.y}px)` }}
              onMouseDown={handlePreviewMouseDown}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase border ${
                      preview.color === 'head'
                        ? 'border-primary-500/20 bg-primary-500/10 text-primary-400'
                        : preview.color === 'manager'
                        ? 'border-manager-500/20 bg-manager-500/10 text-manager-400'
                        : 'border-member-500/20 bg-member-500/10 text-member-400'
                    }`}
                  >
                    {preview.roleLabel}
                  </p>
                  <h3 className="mt-4 text-xl font-bold text-white">{preview.name}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-400">{preview.designation || preview.roleLabel}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview(null);
                  }}
                  className="rounded-full bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">Roles</p>
                  <p className="mt-1.5 text-3xl font-black text-white">{preview.rrCategories.length}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                    {preview.roleLabel === 'Team Member' ? 'Access' : 'Reports'}
                  </p>
                  <p className="mt-1.5 text-3xl font-black text-white">
                    {preview.roleLabel === 'Team Member' ? 'Assigned' : preview.memberCount || 0}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">Key Responsibilities</p>
                <div 
                  className="mt-3 space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-2"
                  onMouseDown={(e) => e.stopPropagation()} // Let scrollbar work without dragging
                >
                  {preview.rrCategories.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-center text-sm font-medium text-slate-400">
                      No key responsibilities assigned
                    </div>
                  ) : (
                    preview.rrCategories.map(item => (
                      <div key={item.id} className="rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                        <p className="font-bold leading-snug text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                          {item.responsibilities.length > 130
                            ? `${item.responsibilities.slice(0, 130)}...`
                            : item.responsibilities}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end" onMouseDown={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 py-3 text-sm font-bold text-white shadow-lg transition hover:from-primary-500 hover:to-accent-500 active:scale-[0.98]"
                  onClick={() => openRoleMatrix(preview.id)}
                >
                  Open Role Matrix
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}