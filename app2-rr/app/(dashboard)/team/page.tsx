'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import {
  Expand, Eye, EyeOff, Minus, Plus, RotateCcw, X, Lock,
  Menu as MenuIcon, GitBranch, Briefcase,
} from 'lucide-react';
import React from 'react';

/* ── Types ─────────────────────────────────────────────── */
type RRCategory = { id: string; title: string; responsibilities: string };

type PreviewNode = {
  id: string;
  name: string;
  designation: string | null;
  role: string;
  parentId: string | null;
  rrCategories: RRCategory[];
  memberCount: number | null;
  color: 'head' | 'manager' | 'member';
  roleLabel: string;
};

/* ── Component ─────────────────────────────────────────── */
export default function TeamPage() {
  const sessionUser = getSessionUser();

  /* data */
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* canvas transform */
  const [scale, setScale] = useState(0.82);
  const [pan, setPan] = useState({ x: 60, y: 30 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  /* toggles */
  const [showMembers, setShowMembers] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  /* refs */
  const stageRef = useRef<HTMLDivElement>(null);

  /* preview modal */
  const [preview, setPreview] = useState<PreviewNode | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 20, y: 80 });
  const [previewDragging, setPreviewDragging] = useState(false);
  const previewDragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  /* ── Fetch hierarchy ─────────────────────────────────── */
  useEffect(() => {
    apiFetch('/api/v1/hierarchy')
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setError(json.error || 'Failed to load'); return; }
        setData(json.data);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  /* ── Global drag listeners ─────────────────────────── */
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragging) {
        setPan({
          x: dragStart.current.panX + (e.clientX - dragStart.current.x),
          y: dragStart.current.panY + (e.clientY - dragStart.current.y),
        });
      }
    }
    function onMovePreview(e: MouseEvent) {
      if (previewDragging) {
        setPreviewPos({
          x: previewDragStart.current.startX + (e.clientX - previewDragStart.current.x),
          y: previewDragStart.current.startY + (e.clientY - previewDragStart.current.y),
        });
      }
    }
    function onUp() { setDragging(false); }
    function onUpPreview() { setPreviewDragging(false); }

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

  /* ── Native wheel listener (non-passive to allow preventDefault) ── */
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  scaleRef.current = scale;
  panRef.current = pan;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const prev = scaleRef.current;
      const next = Math.min(2.0, Math.max(0.25, prev + delta));
      const wx = (cx - panRef.current.x) / prev;
      const wy = (cy - panRef.current.y) / prev;
      setPan({ x: cx - wx * next, y: cy - wy * next });
      setScale(next);
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [loading]);

  /* ── Stats ────────────────────────────────────────────── */
  const stats = useMemo(() => {
    let heads = 0, managers = 0, members = 0, roles = 0;
    if (data?.type === 'self') {
      members = 1; roles = data.user?.rrCategories?.length || 0;
    } else if (data?.type === 'manager') {
      managers = 1; members = data.team?.length || 0;
      roles = (data.self?.rrCategories?.length || 0) +
        (data.team?.reduce((s: number, m: any) => s + (m.rrCategories?.length || 0), 0) || 0);
    } else if (data?.type === 'hierarchy') {
      heads = 1 + (data.heads?.length || 0);
      const all = data.owner ? [data.owner, ...(data.heads || [])] : (data.heads || []);
      all.forEach((h: any) => {
        roles += h.rrCategories?.length || 0;
        managers += h.managers?.length || 0;
        members += h.directMembers?.length || 0;
        roles += h.directMembers?.reduce((s: number, m: any) => s + (m.rrCategories?.length || 0), 0) || 0;
        h.managers?.forEach((mgr: any) => {
          roles += mgr.rrCategories?.length || 0;
          members += mgr.children?.length || 0;
          roles += mgr.children?.reduce((s: number, m: any) => s + (m.rrCategories?.length || 0), 0) || 0;
        });
      });
    }
    return { heads, managers, members, roles };
  }, [data]);

  /* ── Layout engine (top-down tree) ───────────────────── */
  const graph = useMemo(() => {
    /* Gather roots */
    let roots: any[] = [];
    if (data?.type === 'self') {
      roots = [{ ...data.user, managers: [], directMembers: [] }];
    } else if (data?.type === 'manager') {
      roots = [{ ...data.self, managers: [], directMembers: data.team || [] }];
    } else if (data?.type === 'hierarchy') {
      if (data.owner) roots.push({ ...data.owner, managers: data.managers || [], directMembers: data.directMembers || [] });
      (data.heads || []).forEach((h: any) => roots.push({ ...h, managers: h.managers || [], directMembers: h.directMembers || [] }));
    }

    const NW = 280;     // node width
    const NH = 78;      // node height (head/mgr)
    const MH = 62;      // member row height (compact)
    const COL_GAP = 36; // horizontal gap between columns
    const ROW1 = 90;    // root row Y
    const ROW2 = ROW1 + NH + 80; // manager row Y
    const ROW3_START = ROW2 + NH + 36; // member rows start
    const MEM_GAP = 8;  // vertical gap between members

    let cursorX = 60;
    let maxY = 600;
    const allLayouts: any[] = [];

    roots.forEach((root) => {
      const mgrList = root.managers || [];
      const dirList = root.directMembers || [];
      const columns = [
        ...mgrList.map((mgr: any) => ({ type: 'manager' as const, mgr, members: showMembers ? (mgr.children || []) : [] })),
        ...(dirList.length > 0 ? [{ type: 'direct' as const, mgr: null, members: showMembers ? dirList : [] }] : []),
      ];

      if (columns.length === 0) columns.push({ type: 'direct' as const, mgr: null, members: [] });

      const rootStartX = cursorX;
      const mgrLayouts: any[] = [];
      const dirLayouts: any[] = [];

      columns.forEach((col) => {
        const colX = cursorX;
        const memberLayouts: any[] = [];

        col.members.forEach((mem: any, idx: number) => {
          const memY = ROW3_START + idx * (MH + MEM_GAP);
          memberLayouts.push({ ...mem, x: colX, y: memY });
          maxY = Math.max(maxY, memY + MH + 40);
        });

        if (col.type === 'manager' && col.mgr) {
          mgrLayouts.push({ ...col.mgr, x: colX, y: ROW2, members: memberLayouts });
        } else {
          dirLayouts.push(...memberLayouts);
        }

        cursorX += NW + COL_GAP;
      });

      // centre root above its columns
      const totalW = cursorX - rootStartX - COL_GAP;
      const rootX = rootStartX + totalW / 2 - NW / 2;

      allLayouts.push({
        ...root,
        x: rootX,
        y: ROW1,
        managers: mgrLayouts,
        directMembers: dirLayouts,
      });

      cursorX += 100; // space between root groups
    });

    return { width: Math.max(1200, cursorX), height: maxY, roots: allLayouts, NW, NH, MH };
  }, [data, showMembers]);

  /* ── Interaction handlers ────────────────────────────── */
  function handlePreviewMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setPreviewDragging(true);
    previewDragStart.current = { x: e.clientX, y: e.clientY, startX: previewPos.x, startY: previewPos.y };
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }

  // Wheel is handled via native addEventListener above (non-passive)

  function showPreviewModal(node: any, color: 'head' | 'manager' | 'member', roleLabel: string, memberCount: number | null) {
    setPreview({ ...node, color, roleLabel, memberCount });
    setPreviewPos({ x: 20, y: 80 });
  }

  const canViewRoles = useCallback((nodeId: string, nodeParentId: string | null) => {
    if (!sessionUser) return false;
    const r = sessionUser.role;
    if (['SUPER_ADMIN', 'SUPER_BOSS', 'ADMIN'].includes(r)) return true;
    if (r === 'MANAGER') return sessionUser.id === nodeId || sessionUser.id === nodeParentId;
    if (r === 'TEAM_MEMBER') return sessionUser.id === nodeId;
    return false;
  }, [sessionUser]);

  /* ── Loading / Error ─────────────────────────────────── */
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#070b12]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
  if (error) return (
    <div className="flex h-screen items-center justify-center bg-[#070b12]">
      <div className="rounded-2xl border border-red-900/50 bg-red-900/10 p-8 text-red-400 font-bold">{error}</div>
    </div>
  );

  /* ── Render ──────────────────────────────────────────── */
  const { NW, NH, MH } = graph;

  return (
    <div ref={stageRef} className="relative h-[calc(100vh-2rem)] w-full overflow-hidden rounded-3xl border border-white/5 bg-[#060a11]">

      {/* ═══ Floating Summary + Legend (toggled by showUI) ═══ */}
      <div className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Summary card top-left */}
        <div className="pointer-events-auto absolute left-5 top-5 w-[300px] rounded-[1.5rem] border border-white/8 bg-[#0b111a]/85 p-5 shadow-2xl backdrop-blur-xl">
          <h2 className="flex items-center gap-2 text-sm font-black text-white tracking-tight">
            <GitBranch className="h-4 w-4 text-blue-500" /> Organization Map
          </h2>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[.15em] text-slate-500">Interactive Architecture</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: 'Heads', val: stats.heads, c: 'text-blue-400' },
              { label: 'Mgrs', val: stats.managers, c: 'text-indigo-400' },
              { label: 'Members', val: stats.members, c: 'text-cyan-400' },
              { label: 'Roles', val: stats.roles, c: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label} className="rounded-xl bg-white/[0.04] border border-white/5 px-2 py-2.5 text-center">
                <p className={`text-[9px] font-black uppercase tracking-wider ${m.c}`}>{m.label}</p>
                <p className="text-lg font-black text-white leading-none mt-1">{m.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend bottom-left */}
        <div className="pointer-events-auto absolute left-5 bottom-5 flex items-center gap-1.5 rounded-2xl bg-[#0b111a]/85 p-2.5 backdrop-blur-xl border border-white/8 shadow-xl">
          {[
            { label: 'DC Head', bg: 'bg-blue-500/15', border: 'border-blue-500/25', text: 'text-blue-400', dot: 'bg-blue-500' },
            { label: 'Manager', bg: 'bg-indigo-500/15', border: 'border-indigo-500/25', text: 'text-indigo-400', dot: 'bg-indigo-500' },
            { label: 'Member', bg: 'bg-cyan-500/15', border: 'border-cyan-500/25', text: 'text-cyan-400', dot: 'bg-cyan-500' },
          ].map(l => (
            <div key={l.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${l.bg} border ${l.border} ${l.text} text-[10px] font-black tracking-wider uppercase`}>
              <span className={`w-2 h-2 rounded-full ${l.dot}`} /> {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Floating Action Menu (top-right) ═══ */}
      <div className="absolute right-5 top-5 z-50 flex items-start gap-2">
        {menuOpen && (
          <div className="flex items-center bg-[#0b111a]/95 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-2xl p-1.5 gap-0.5">
            <button
              className={`rounded-xl p-2.5 transition hover:bg-white/10 ${!showMembers ? 'text-yellow-400' : 'text-slate-300'}`}
              onClick={() => setShowMembers(p => !p)} title={showMembers ? 'Hide Members' : 'Show Members'}
            >
              {showMembers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              className={`rounded-xl p-2.5 transition hover:bg-white/10 ${!showUI ? 'text-blue-400' : 'text-slate-300'}`}
              onClick={() => setShowUI(p => !p)} title="Toggle Summary"
            >
              <GitBranch className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button className="rounded-xl p-2.5 text-slate-300 transition hover:bg-white/10" onClick={() => setScale(p => Math.max(0.25, p - 0.1))} title="Zoom Out"><Minus className="h-4 w-4" /></button>
            <button className="rounded-xl p-2.5 text-slate-300 transition hover:bg-white/10" onClick={() => setScale(p => Math.min(2.0, p + 0.1))} title="Zoom In"><Plus className="h-4 w-4" /></button>
            <button className="rounded-xl p-2.5 text-slate-300 transition hover:bg-white/10" onClick={() => { setScale(0.82); setPan({ x: 60, y: 30 }); }} title="Reset"><RotateCcw className="h-4 w-4" /></button>
            <button className="rounded-xl p-2.5 text-slate-300 transition hover:bg-white/10" onClick={async () => {
              const el = stageRef.current; if (!el) return;
              document.fullscreenElement ? await document.exitFullscreen() : await el.requestFullscreen();
            }} title="Fullscreen"><Expand className="h-4 w-4" /></button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_8px_20px_-4px_rgba(37,99,235,0.5)] transition hover:bg-blue-500 hover:scale-105 active:scale-95"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* ═══ Pannable / Zoomable Canvas ═══ */}
      <div
        className={`absolute inset-0 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasMouseDown}
      >
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: dragging ? 'none' : 'transform 120ms ease-out',
        }}>

          {/* SVG connector lines */}
          <svg viewBox={`0 0 ${graph.width} ${graph.height}`} style={{ width: graph.width, height: graph.height }} className="pointer-events-none absolute inset-0">
            <defs>
              <linearGradient id="lg-head" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="lg-mgr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {graph.roots.map((root: any, ri: number) => (
              <g key={`lines-${ri}`}>
                {/* root → manager curves */}
                {root.managers.map((mgr: any) => {
                  const sx = root.x + NW / 2, sy = root.y + NH;
                  const ex = mgr.x + NW / 2, ey = mgr.y;
                  const mid = (sy + ey) / 2;
                  return <path key={`rm-${mgr.id}`} d={`M${sx} ${sy} C${sx} ${mid}, ${ex} ${mid}, ${ex} ${ey}`}
                    fill="none" stroke="url(#lg-head)" strokeWidth="2.5" />;
                })}

                {/* root → direct members */}
                {root.directMembers.length > 0 && (() => {
                  const firstMem = root.directMembers[0];
                  const sx = root.x + NW / 2, sy = root.y + NH;
                  const ex = firstMem.x + NW / 2, ey = firstMem.y;
                  const mid = (sy + ey) / 2;
                  return (
                    <React.Fragment key="dm-lines">
                      <path d={`M${sx} ${sy} C${sx} ${mid}, ${ex} ${mid}, ${ex} ${ey}`}
                        fill="none" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.35" strokeDasharray="6,4" />
                      {root.directMembers.length > 1 && (
                        <line x1={ex} y1={firstMem.y + MH} x2={ex}
                          y2={root.directMembers[root.directMembers.length - 1].y}
                          stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4,4" />
                      )}
                    </React.Fragment>
                  );
                })()}

                {/* manager → member vertical stems */}
                {root.managers.map((mgr: any) => {
                  if (!mgr.members || mgr.members.length === 0) return null;
                  const cx = mgr.x + NW / 2;
                  const first = mgr.members[0];
                  const last = mgr.members[mgr.members.length - 1];
                  return (
                    <g key={`stem-${mgr.id}`}>
                      <path d={`M${cx} ${mgr.y + NH} C${cx} ${mgr.y + NH + 18}, ${cx} ${first.y - 18}, ${cx} ${first.y}`}
                        fill="none" stroke="url(#lg-mgr)" strokeWidth="2" />
                      {mgr.members.length > 1 && (
                        <line x1={cx} y1={first.y + MH} x2={cx} y2={last.y}
                          stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.18" strokeDasharray="3,3" />
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>

          {/* HTML node cards */}
          {graph.roots.map((root: any, ri: number) => (
            <React.Fragment key={`n-${ri}`}>

              {/* ── Root (DC Head) card ── */}
              <div
                className="absolute rounded-2xl flex flex-col items-center justify-center text-center pointer-events-auto cursor-pointer
                  border border-blue-400/40 shadow-[0_8px_30px_-8px_rgba(37,99,235,0.35)]
                  transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(37,99,235,0.5)]"
                style={{
                  left: root.x, top: root.y, width: NW, height: NH,
                  background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
                }}
                onMouseDown={e => e.stopPropagation()}
                onClick={() => showPreviewModal(root, 'head', 'DC Head', root.managers.length + root.directMembers.length)}
              >
                <h3 className="text-[15px] font-black text-white truncate max-w-[90%] leading-tight">{root.name}</h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-blue-100 truncate max-w-[80%]">{root.designation || 'DC Head'}</p>
                <span className="mt-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[9px] font-black text-white uppercase tracking-wider">
                  {root.managers.length + root.directMembers.length} branches
                </span>
              </div>

              {/* ── Manager cards ── */}
              {root.managers.map((mgr: any) => (
                <div
                  key={`mgr-${mgr.id}`}
                  className="absolute rounded-2xl flex flex-col items-center justify-center text-center pointer-events-auto cursor-pointer
                    border border-indigo-400/30 shadow-[0_6px_24px_-6px_rgba(99,102,241,0.3)]
                    transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_35px_-8px_rgba(99,102,241,0.45)]"
                  style={{
                    left: mgr.x, top: mgr.y, width: NW, height: NH,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => showPreviewModal(mgr, 'manager', 'Manager', mgr.members.length)}
                >
                  <h3 className="text-[14px] font-bold text-white truncate max-w-[88%] leading-tight">{mgr.name}</h3>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 truncate max-w-[80%]">{mgr.designation || 'Manager'}</p>
                  <span className="mt-1 bg-white/15 px-2 py-0.5 rounded-full text-[9px] font-bold text-indigo-100 uppercase">
                    {mgr.members.length} members
                  </span>
                </div>
              ))}

              {/* ── Direct member cards ── */}
              {root.directMembers.map((mem: any) => (
                <div
                  key={`dm-${mem.id}`}
                  className="absolute rounded-xl flex items-center pointer-events-auto cursor-pointer
                    border border-cyan-500/25 bg-[#0c1424] hover:bg-[#152035] transition-colors duration-150
                    shadow-[0_2px_12px_-4px_rgba(6,182,212,0.15)]"
                  style={{ left: mem.x, top: mem.y, width: NW, height: MH }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => showPreviewModal(mem, 'member', 'Direct Report', 0)}
                >
                  <div className="w-1 self-stretch bg-cyan-500 rounded-l-xl" />
                  <div className="flex-1 min-w-0 px-4 py-2">
                    <h4 className="text-[13px] font-bold text-slate-100 truncate leading-tight">{mem.name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate mt-0.5">{mem.designation || 'ITMS'}</p>
                  </div>
                </div>
              ))}

              {/* ── Team member cards (under managers) ── */}
              {root.managers.map((mgr: any) =>
                mgr.members.map((mem: any) => (
                  <div
                    key={`m-${mem.id}`}
                    className="absolute rounded-xl flex items-center pointer-events-auto cursor-pointer group
                      border border-slate-700/40 bg-[#0c1424] hover:bg-[#152035] hover:border-indigo-500/25
                      transition-all duration-150 shadow-sm"
                    style={{ left: mem.x, top: mem.y, width: NW, height: MH }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => showPreviewModal(mem, 'member', 'Team Member', 0)}
                  >
                    <div className="w-1 self-stretch bg-slate-700 group-hover:bg-cyan-500 rounded-l-xl transition-colors" />
                    <div className="flex-1 min-w-0 px-4 py-2">
                      <h4 className="text-[13px] font-semibold text-slate-200 truncate leading-tight group-hover:text-cyan-300 transition-colors">{mem.name}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate mt-0.5">{mem.designation || 'ITMS'}</p>
                    </div>
                  </div>
                ))
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ═══ Draggable Preview Modal ═══ */}
      {preview && (
        <div
          className={`absolute z-50 w-[400px] rounded-[1.8rem] border border-white/10 bg-[#070b12]/95 p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl
            ${previewDragging ? 'cursor-grabbing scale-[1.01]' : 'cursor-grab'} transition-transform duration-75`}
          style={{ transform: `translate(${previewPos.x}px, ${previewPos.y}px)` }}
          onMouseDown={handlePreviewMouseDown}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black tracking-widest uppercase border ${
                preview.color === 'head' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                preview.color === 'manager' ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' :
                'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${preview.color === 'head' ? 'bg-blue-400' : preview.color === 'manager' ? 'bg-indigo-400' : 'bg-cyan-400'}`} />
                {preview.roleLabel}
              </p>
              <h3 className="mt-3 text-xl font-black text-white tracking-tight truncate">{preview.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{preview.designation || preview.roleLabel}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); setPreview(null); }}
              className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/15 hover:text-white transition mt-1"
              onMouseDown={e => e.stopPropagation()}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Metrics */}
          <div className="mt-5 grid grid-cols-2 gap-2.5" onMouseDown={e => e.stopPropagation()}>
            <div className="rounded-xl border border-white/5 bg-slate-900/50 p-3">
              <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Roles</p>
              <p className="text-2xl font-black text-slate-100 mt-0.5">{preview.rrCategories?.length || 0}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-900/50 p-3">
              <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">{preview.color === 'member' ? 'Status' : 'Reports'}</p>
              <p className="text-2xl font-black text-slate-100 mt-0.5">{preview.color === 'member' ? 'Active' : preview.memberCount || 0}</p>
            </div>
          </div>

          {/* Responsibilities */}
          {canViewRoles(preview.id, preview.parentId) ? (
            <div className="mt-5" onMouseDown={e => e.stopPropagation()}>
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2.5">Key Responsibilities</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1.5">
                {!preview.rrCategories || preview.rrCategories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-4 text-center text-sm text-slate-500">
                    No responsibilities assigned
                  </div>
                ) : preview.rrCategories.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-white/5 bg-slate-900 p-3.5 hover:bg-slate-800 transition-colors">
                    <p className="font-bold text-sm text-slate-200 leading-snug">{item.title}</p>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                      {item.responsibilities?.length > 120 ? `${item.responsibilities.slice(0, 120)}…` : item.responsibilities}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/5">
                <button
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-[13px] font-bold text-white
                    shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)] transition hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
                  onClick={() => { window.location.href = `/rr?userId=${preview.id}`; }}
                >
                  <Briefcase className="h-4 w-4" /> Open Role Matrix
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-red-900/30 bg-red-950/20 p-5 text-center" onMouseDown={e => e.stopPropagation()}>
              <Lock className="h-5 w-5 text-red-500/60 mx-auto mb-2" />
              <p className="text-sm font-bold text-red-400">Restricted Access</p>
              <p className="mt-1 text-xs text-red-300/60">You don't have permission to view this unit's responsibilities.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}