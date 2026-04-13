'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import {
  Expand, Eye, EyeOff, Minus, Plus, RotateCcw, X, Lock,
  Menu as MenuIcon, GitBranch, Briefcase, ChevronDown, Maximize,
  Shield, Users, Zap, Award, ExternalLink, GripVertical, Maximize2,
  Fullscreen
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

/* ── Layout Constants ─────────────────────────────────── */
const NW = 340;      
const NH = 100;      
const MH = 72;       
const COL_GAP = 56;  
const ROW_GAP = 140; 
const MEM_GAP = 16; 

/* ── Component ─────────────────────────────────────────── */
export default function TeamPage() {
  const sessionUser = getSessionUser();

  /* data */
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* canvas transform */
  const [scale, setScale] = useState(0.85);
  const [pan, setPan] = useState({ x: 120, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  /* toggles */
  const [showMembers, setShowMembers] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  /* refs */
  const stageRef = useRef<HTMLDivElement>(null);

  /* floating preview state */
  const [preview, setPreview] = useState<PreviewNode | null>(null);
  const [previewMinimized, setPreviewMinimized] = useState(false);
  const [previewImmersive, setPreviewImmersive] = useState(false);
  const [previewPos, setPreviewPos] = useState({ left: 400, top: 120 });
  const [previewDragging, setPreviewDragging] = useState(false);

  /* fetch hierarchy */
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

  /* drag listeners */
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragging) {
        setPan({
          x: dragStart.current.panX + (e.clientX - dragStart.current.x),
          y: dragStart.current.panY + (e.clientY - dragStart.current.y),
        });
      }
      if (previewDragging) {
        setPreviewPos(prev => ({
          left: prev.left + (e.clientX - dragStart.current.x),
          top: prev.top + (e.clientY - dragStart.current.y),
        }));
        dragStart.current.x = e.clientX;
        dragStart.current.y = e.clientY;
      }
    }
    function onUp() { setDragging(false); setPreviewDragging(false); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, previewDragging]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.preview-card')) return;
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setScale(prev => Math.min(2.0, Math.max(0.12, prev + delta)));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.node-card')) return;
    if (e.target instanceof HTMLElement && e.target.closest('.preview-card')) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const startPreviewDrag = (e: React.MouseEvent) => {
    setPreviewDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: 0, panY: 0 };
    e.stopPropagation();
  };

  const handlePreviewClick = (node: any) => {
    // When clicking a new node, always center it first
    const centerX = (window.innerWidth / 2) - 220;
    const centerY = (window.innerHeight / 2) - 310;
    setPreviewPos({ left: centerX, top: centerY });
    setPreview(node);
    setPreviewMinimized(false);
  };

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  /* ── Stats Aggregation ───────────────────────────────── */
  const stats = useMemo(() => {
    let heads = 0, managers = 0, members = 0, roles = 0;
    if (!data) return { heads, managers, members, roles };
    
    const countRecursive = (node: any) => {
      if (node.role === 'SUPER_BOSS') heads++;
      else if (node.role === 'MANAGER') managers++;
      else members++;

      roles += node.rrCategories?.length || 0;
      
      const allChildren = [
        ...(node.managers || []),
        ...(node.directMembers || []),
        ...(node.children || []),
        ...(node.heads || []),
        ...(node.items || [])
      ];
      
      // Use a set to avoid double counting if the API returns redundant lists
      const uniqueChildIds = Array.from(new Set(allChildren.map(c => c.id)));
      uniqueChildIds.forEach(id => {
        const child = allChildren.find(c => c.id === id);
        if (child) countRecursive(child);
      });
    };

    const allRoots = data.roots || (data.owner ? [data] : []);
    allRoots.forEach((rootObj: any) => countRecursive(rootObj.owner || rootObj));
    
    return { heads, managers, members, roles };
  }, [data]);

  /* ── Layout Engine ────────────────────────── */
  const graph = useMemo(() => {
    const rootGroups = data?.type === 'hierarchy' ? (data.roots || [data]) : [];
    let groupCursorX = 0;
    let maxContentY = 0;
    const rootLayouts: any[] = [];

    rootGroups.forEach((group: any) => {
      const root = group.owner;
      if (!root) return;
      const groupStartX = groupCursorX;
      let managerCursorX = groupCursorX;
      const groupManagers: any[] = [];
      const groupHeads: any[] = [];
      const groupDirectMembers: any[] = [];

      const managerBranches = (group.managers || []).map((m: any) => ({ ...m, type: 'MANAGER', items: m.children || [] }));
      managerBranches.forEach((branch: any) => {
        const branchX = managerCursorX;
        const branchY = NH + ROW_GAP;
        const memberLayouts = (showMembers ? branch.items : []).map((mem: any, idx: number) => {
          const memY = branchY + NH + 50 + idx * (MH + MEM_GAP);
          maxContentY = Math.max(maxContentY, memY + MH + 300);
          return { ...mem, x: branchX, y: memY };
        });
        groupManagers.push({ ...branch, x: branchX, y: branchY, members: memberLayouts });
        managerCursorX += NW + COL_GAP;
      });

      if (groupManagers.length > 0 && group.heads?.length > 0) {
        managerCursorX += 200; 
      }

      const headBranches = (group.heads || []).map((h: any) => {
        // Correctly unify all items reporting to this head:
        // - Managers and their children
        // - Direct members
        const allItems = [
          ...(h.managers || []).flatMap((m: any) => [m, ...(m.children || [])]),
          ...(h.directMembers || [])
        ];
        return { ...h, type: 'HEAD', items: allItems };
      });
      headBranches.forEach((branch: any) => {
        const branchX = managerCursorX;
        const branchY = NH + ROW_GAP;
        const memberLayouts = (showMembers ? branch.items : []).map((mem: any, idx: number) => {
          const memY = branchY + NH + 50 + idx * (MH + MEM_GAP);
          maxContentY = Math.max(maxContentY, memY + MH + 300);
          return { ...mem, x: branchX, y: memY };
        });
        groupHeads.push({ ...branch, x: branchX, y: branchY, items: memberLayouts, directMembers: memberLayouts });
        managerCursorX += NW + COL_GAP;
      });

      if (group.directMembers?.length > 0) {
        managerCursorX += 100;
        const dmX = managerCursorX;
        const dmYBase = NH + ROW_GAP;
        group.directMembers.forEach((mem: any, idx: number) => {
          const mY = dmYBase + idx * (MH + MEM_GAP);
          groupDirectMembers.push({ ...mem, x: dmX, y: mY });
          maxContentY = Math.max(maxContentY, mY + MH + 300);
        });
        managerCursorX += NW + COL_GAP;
      }

      const rootX = groupStartX + ((managerCursorX - groupStartX - COL_GAP) / 2) - (NW / 2);
      rootLayouts.push({ ...root, x: rootX, y: 0, managers: groupManagers, heads: groupHeads, directMembers: groupDirectMembers, groupWidth: managerCursorX - groupStartX });
      groupCursorX = managerCursorX + 400; 
    });

    return { width: groupCursorX, height: maxContentY, roots: rootLayouts };
  }, [data, showMembers]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#03060a]">
      <div className="relative h-20 w-20">
         <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
         <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin" />
         <Zap className="absolute inset-0 m-auto h-8 w-8 text-amber-500 animate-pulse" />
      </div>
    </div>
  );

  const { roots } = graph;

  return (
    <div ref={stageRef} onWheel={handleWheel} className="relative h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[3rem] border border-white/10 bg-[#020408] selection:bg-amber-500/30">
      
      {/* ── Background Grid ── */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] to-transparent pointer-events-none" />

      {/* ── Stats Panel ── */}
      {showUI && (
        <div className="pointer-events-none absolute left-10 top-10 z-[60] w-[340px] animate-in slide-in-from-left-10 duration-500">
           <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/60 backdrop-blur-3xl shadow-2xl">
              <div className="bg-gradient-to-r from-amber-600/20 to-transparent p-7 border-b border-white/5">
                 <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                       <GitBranch className="h-6 w-6" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-white tracking-tight">Organization Map</h2>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80 mt-1">Strategic Architecture</p>
                    </div>
                 </div>
              </div>
              <div className="p-7 grid grid-cols-2 gap-4">
                 {[
                   { label: 'Strategic Heads', val: stats.heads, c: 'text-amber-400', bg: 'bg-amber-500/10' },
                   { label: 'Team Leaders', val: stats.managers, c: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                   { label: 'Specialists', val: stats.members, c: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                   { label: 'Matrix Nodes', val: stats.roles, c: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                 ].map(m => (
                   <div key={m.label} className={`rounded-3xl border border-white/5 p-4 ${m.bg}`}>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${m.c} opacity-80`}>{m.label}</p>
                      <p className="mt-2 text-2xl font-black text-white leading-none">{m.val}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* ── Control Console ── */}
      <div className="absolute right-10 top-10 z-[60] flex items-start gap-4">
        {menuOpen && (
          <div className="flex items-center gap-1 rounded-3xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-3xl animate-in slide-in-from-right-8 duration-300">
            <button className={`rounded-2xl p-4 transition-all hover:bg-white/10 ${showMembers ? 'text-amber-500' : 'text-slate-500'}`} onClick={() => setShowMembers(!showMembers)} title="Toggle Visibility">
              {showMembers ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
            <button className={`rounded-2xl p-4 transition-all hover:bg-white/10 ${showUI ? 'text-emerald-500' : 'text-slate-500'}`} onClick={() => setShowUI(!showUI)} title="Dashboard Toggle">
              <Zap className="h-5 w-5" />
            </button>
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={toggleFullScreen} title="Fullscreen Map"><Maximize className="h-5 w-5" /></button>
            <div className="mx-2 h-8 w-px bg-white/10" />
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={() => setScale(s => Math.max(0.1, s - 0.1))}><Minus className="h-5 w-5" /></button>
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={() => setScale(s => Math.min(2.0, s + 0.1))}><Plus className="h-5 w-5" /></button>
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={() => { setScale(0.85); setPan({ x: 120, y: 80 }); }}><RotateCcw className="h-5 w-5" /></button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-600 text-white shadow-[0_20px_40px_-10px_rgba(217,119,6,0.5)] transition-all hover:scale-105 active:scale-95"
        >
          {menuOpen ? <X className="h-7 w-7" /> : <MenuIcon className="h-7 w-7" />}
        </button>
      </div>

      {/* ── Virtual Stage ── */}
      <div 
        className={`absolute inset-0 ${dragging ? 'cursor-grabbing' : 'cursor-grab'} outline-none`}
        onMouseDown={handleCanvasMouseDown}
      >
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 400ms cubic-bezier(0.2, 0, 0, 1)',
          transformOrigin: '0 0'
        }}>
          
          <svg width={graph.width + 2000} height={graph.height + 2000} className="absolute pointer-events-none">
            {roots.map((root: any) => {
              const lastManager = root.managers[root.managers.length - 1];
              const firstHead = root.heads[0];
              const dividerX = (lastManager && firstHead) ? (lastManager.x + firstHead.x + NW) / 2 : null;
              return (
                <g key={`divide-n-label-${root.id}`}>
                  {dividerX && (
                    <line x1={dividerX} y1={NH + ROW_GAP - 60} x2={dividerX} y2={graph.height} stroke="white" strokeWidth="1" strokeDasharray="8,8" opacity="0.05" />
                  )}
                </g>
              );
            })}

            {/* Matrix Logic: Collect all node positions for functional lines */}
            {(() => {
              const pos: Record<string, { x: number, y: number }> = {};
              roots.forEach(r => {
                pos[r.id] = { x: r.x, y: r.y };
                [...r.managers, ...r.heads].forEach(l => {
                  pos[l.id] = { x: l.x, y: l.y };
                  [...(l.members || []), ...(l.directMembers || []), ...(l.items || [])].forEach(m => {
                    pos[m.id] = { x: m.x, y: m.y };
                  });
                });
                r.directMembers.forEach(m => { pos[m.id] = { x: m.x, y: m.y }; });
              });

              return roots.map((root: any) => (
                <g key={`rays-${root.id}`}>
                  {/* Primary Hierarchy Lines */}
                  {[...root.managers, ...root.heads].map((leader: any) => {
                    const isStrategic = leader.role === 'SUPER_BOSS';
                    const strokeColor = isStrategic ? '#f59e0b' : '#6366f1';
                    const glowColor = isStrategic ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.2)';
                    return (
                      <React.Fragment key={`L-GRP-${leader.id}`}>
                        <path d={`M${root.x + NW/2} ${root.y + NH} C${root.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${leader.y}`} stroke={strokeColor} strokeWidth={isStrategic ? "6" : "4"} fill="none" opacity={isStrategic ? "0.4" : "0.2"} strokeLinecap="round" style={{ filter: isStrategic ? `drop-shadow(0 0 12px ${glowColor})` : 'none' }} />
                        <path d={`M${root.x + NW/2} ${root.y + NH} C${root.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${leader.y}`} stroke={strokeColor} strokeWidth="1.5" fill="none" opacity="0.8" strokeLinecap="round" />
                        {(leader.members || leader.directMembers || leader.items || []).map((mem: any) => (
                           <path key={`MPATH-${mem.id}`} d={`M${leader.x + NW/2} ${leader.y + NH} C${leader.x + NW/2} ${(leader.y + NH + mem.y) / 2}, ${mem.x + NW/2} ${(leader.y + NH + mem.y) / 2}, ${mem.x + NW/2} ${mem.y}`} stroke={isStrategic ? '#f59e0b' : '#6366f1'} strokeWidth="1.5" fill="none" opacity="0.15" strokeLinecap="round" />
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {root.directMembers.map((mem: any) => (
                     <path key={`R-DIR-PATH-${mem.id}`} d={`M${root.x + NW/2} ${root.y + NH} C${root.x + NW/2} ${(root.y+NH+mem.y)/2}, ${mem.x + NW/2} ${(root.y+NH+mem.y)/2}, ${mem.x + NW/2} ${mem.y}`} stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" strokeDasharray="5,3" />
                  ))}

                  {/* Functional Matrix Lines (Improved Sweep Path) */}
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" opacity="0.6" />
                    </marker>
                  </defs>
                  {(() => {
                    const allUsers = [
                      ...root.managers.flatMap((m: any) => m.members || []),
                      ...root.heads.flatMap((h: any) => h.items || h.directMembers || []),
                      ...root.directMembers,
                      ...root.managers,
                      ...root.heads
                    ];
                    return allUsers.map((usr: any) => {
                      if (!usr.functionalId || !pos[usr.functionalId] || usr.functionalId === usr.parentId) return null;
                      const fP = pos[usr.functionalId];
                      
                      const isTargetRight = fP.x >= usr.x;
                      const startX = isTargetRight ? usr.x + NW : usr.x;
                      const startY = usr.y + MH/2;
                      const endX = fP.x + NW/2;
                      const endY = fP.y + NH;
                      const offset = isTargetRight ? 60 : -60;

                      return (
                        <path 
                          key={`FUNC-PATH-${usr.id}`} 
                          d={`M${startX} ${startY} Q ${startX + offset} ${startY}, ${startX + offset} ${(startY + endY)/2} T ${endX} ${endY}`} 
                          stroke="#f59e0b" 
                          strokeWidth="2.5" 
                          fill="none" 
                          opacity="0.35" 
                          strokeDasharray="12,6" 
                          strokeLinecap="round"
                          markerStart="url(#arrowhead)"
                          className="transition-all hover:opacity-100 hover:stroke-amber-400"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.2))' }}
                        />
                      );
                    });
                  })()}
                </g>
              ));
            })()}
          </svg>

          {roots.map((root: any) => (
            <React.Fragment key={root.id}>
              {/* Root Node */}
              <div 
                className="node-card absolute flex flex-col justify-center rounded-[2.5rem] bg-[#0c1424] border-2 border-amber-500/40 p-8 shadow-[0_0_50px_-12px_rgba(245,158,11,0.5)] transition-all hover:scale-[1.03] group hover:border-amber-400"
                style={{ left: root.x, top: root.y, width: NW, height: NH }}
                onClick={() => handlePreviewClick({ ...root, color: 'head', roleLabel: 'Strategic DC Head', memberCount: (root.managers?.length || 0) + (root.heads?.length || 0) })}
              >
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-amber-600 rounded-full px-5 py-1.5 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-amber-500/40">MASTER ROOT</div>
                <div className="flex items-center gap-5">
                   <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-xl shadow-amber-600/20 group-hover:rotate-6 transition-transform">
                      <Shield className="h-7 w-7" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white tracking-tight leading-none uppercase">{root.name}</h3>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-amber-500 opacity-80">{root.designation || 'Strategic Command'}</p>
                   </div>
                </div>
              </div>

              {/* Leaders */}
              {[...root.managers, ...root.heads].map((leader: any) => {
                const isStrategic = leader.role === 'SUPER_BOSS';
                return (
                  <div key={leader.id}
                    className={`node-card absolute flex flex-col justify-center rounded-[2rem] bg-[#0c1424] border-2 p-8 shadow-2xl transition-all hover:scale-[1.03] group ${
                      isStrategic ? 'border-amber-500/40 shadow-amber-500/10' : 'border-indigo-500/30'
                    }`}
                    style={{ left: leader.x, top: leader.y, width: NW, height: NH }}
                    onClick={() => handlePreviewClick({ ...leader, color: isStrategic ? 'head' : 'manager', roleLabel: isStrategic ? 'Strategic DC Head' : 'Operations Manager', memberCount: (leader.members || leader.directMembers || []).length })}
                  >
                    <div className={`absolute top-0 right-10 -translate-y-1/2 rounded-full px-4 py-1 text-[9px] font-black text-white uppercase tracking-widest ${
                      isStrategic ? 'bg-amber-600 shadow-amber-600/20' : 'bg-indigo-600'
                    }`}>
                      {(leader.members || leader.directMembers || []).length} Specialists
                    </div>
                    <div className="flex items-center gap-5">
                       <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white transition-all group-hover:scale-110 ${
                          isStrategic ? 'bg-amber-600' : 'bg-indigo-600'
                       }`}>
                          {isStrategic ? <Shield className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                       </div>
                       <div className="min-w-0 flex-1">
                          <h3 className="text-[17px] font-black text-white tracking-tight leading-none truncate group-hover:text-amber-400 transition-colors uppercase">{leader.name}</h3>
                          <p className={`mt-2 text-[10px] font-bold uppercase tracking-widest truncate ${isStrategic ? 'text-amber-500/60' : 'text-slate-500'}`}>{leader.designation || 'Operations Unit'}</p>
                       </div>
                    </div>
                  </div>
                );
              })}

              {/* Specialists */}
              {[
                ...root.managers.flatMap((m: any) => m.members || []), 
                ...root.heads.flatMap((h: any) => h.items || h.directMembers || []),
                ...root.directMembers
              ].map((mem: any) => (
                <div key={mem.id}
                  className="node-card absolute flex items-center rounded-2xl bg-[#0d121d] border border-white/5 pl-5 pr-6 py-4 shadow-sm hover:bg-[#161d2b] hover:border-cyan-500/50 transition-all hover:scale-[1.02] cursor-pointer group"
                  style={{ left: mem.x, top: mem.y, width: NW, height: MH }}
                  onClick={() => handlePreviewClick({ ...mem, color: 'member', roleLabel: 'Tactical Specialist', memberCount: 0 })}
                >
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                     {mem.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <p className="text-[15px] font-black text-slate-100 truncate tracking-tight">{mem.name}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-500 mt-1 tracking-widest group-hover:text-cyan-500 transition-colors">{mem.designation || 'ITMS Expert'}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-700 opacity-20 group-hover:opacity-100" />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Overlay Preview Layer ── */}
      {preview && (
        <>
          {/* Draggable/Minimizable Card */}
          <div 
            className="preview-card absolute z-[200] w-[440px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] backdrop-blur-3xl animate-in zoom-in-95 duration-300 overflow-hidden rounded-[2.5rem] border-2 border-white/10"
            style={{ 
               left: previewPos.left, 
               top: previewPos.top,
               height: previewMinimized ? '72px' : '620px',
               transition: previewDragging ? 'none' : 'height 300ms cubic-bezier(0.2, 0, 0, 1)'
            }}
            onMouseDown={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
          >
             <div 
               className={`flex items-center justify-between h-[72px] px-7 cursor-grab active:cursor-grabbing border-b border-white/5 ${
                 preview.color === 'head' ? 'bg-amber-600/20' : preview.color === 'manager' ? 'bg-indigo-600/20' : 'bg-cyan-600/20'
               }`}
               onMouseDown={startPreviewDrag}
             >
                <div className="flex items-center gap-4">
                   <GripVertical className="h-5 w-5 text-white/20" />
                   <h3 className="text-sm font-black text-white uppercase tracking-widest">Neural Identity</h3>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => setPreviewMinimized(!previewMinimized)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                      {previewMinimized ? <Expand className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                   </button>
                   <button onClick={() => setPreviewImmersive(true)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all" title="Enlarge Info View"><Maximize2 className="h-4 w-4" /></button>
                   <button onClick={() => setPreview(null)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"><X className="h-4 w-4" /></button>
                </div>
             </div>

             {!previewMinimized && (
                <div className="flex flex-col h-[calc(620px-72px)] bg-[#080b11]">
                   <div className="p-8 pb-4">
                      <div className="flex items-center gap-6">
                         <div className={`h-20 w-20 rounded-[1.8rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl ${
                            preview.color === 'head' ? 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/30' : 
                            preview.color === 'manager' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/30' :
                            'bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-cyan-500/30'
                         }`}>
                            {preview.name.charAt(0)}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-black text-white leading-none tracking-tight uppercase truncate">{preview.name}</h3>
                            <div className="flex items-center gap-2 mt-4">
                               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{preview.roleLabel}</span>
                            </div>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 truncate">{preview.designation || 'Specialist'}</p>
                         </div>
                      </div>
                   </div>

                   <div className="flex-1 overflow-auto px-8 py-4 custom-scrollbar space-y-4">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] ml-1">Responsibility Matrix</p>
                      
                      {/* Privacy Logic: Only show RR categories to the owner, their manager, or Super Admin/Head */}
                      {(sessionUser?.id === preview.id || sessionUser?.id === preview.parentId || sessionUser?.id === preview.functionalId || ['SUPER_ADMIN', 'SUPER_BOSS'].includes(sessionUser?.role || '')) ? (
                        <>
                          {preview.rrCategories?.map((c: any) => (
                            <div key={c.id} className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-all">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className={`h-1.5 w-1.5 rounded-full ${preview.color === 'head' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                  <h4 className="font-black text-white text-[11px] uppercase tracking-tight">{c.title}</h4>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-semibold">{c.responsibilities}</p>
                            </div>
                          ))}
                          {(!preview.rrCategories || preview.rrCategories.length === 0) && (
                            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                                <Award className="h-8 w-8 text-slate-700 mx-auto mb-3 opacity-30" />
                                <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">No Intelligence Assigned</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-20 text-center border border-white/5 rounded-[2.5rem] bg-white/[0.02] backdrop-blur-md">
                           <Lock className="h-10 w-10 text-slate-700 mx-auto mb-4 opacity-40 animate-pulse" />
                           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Confidential Protocol</p>
                           <p className="mt-2 text-[9px] text-slate-600 font-bold uppercase">Personal Responsibility Matrix Restricted</p>
                        </div>
                      )}
                   </div>

                   <div className="p-8 pt-4 border-t border-white/5 flex gap-3">
                      <button onClick={() => window.location.href=`/rr?userId=${preview.id}`} className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                         <ExternalLink className="h-3.5 w-3.5" /> Neural Link
                      </button>
                      <button disabled className="flex-1 bg-amber-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 opacity-50">
                         Actions
                      </button>
                   </div>
                </div>
             )}
          </div>

          {/* Immersive Modal (Deep View) */}
          {previewImmersive && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in transition-all" onClick={() => setPreviewImmersive(false)}>
               <div className="w-[500px] bg-[#0b0c10] rounded-[3rem] p-12 border-2 border-white/10 relative shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPreviewImmersive(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white bg-white/5 p-3 rounded-2xl transition-all"><X className="h-6 w-6" /></button>
                  <div className="flex items-center gap-8 mb-10">
                     <div className={`h-24 w-24 rounded-[1.8rem] flex items-center justify-center text-4xl font-black text-white ${
                        preview.color === 'head' ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'
                     }`}>
                        {preview.name.charAt(0)}
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-white uppercase">{preview.name}</h3>
                        <p className="mt-2 text-[11px] font-black uppercase text-amber-500 tracking-[0.2em]">{preview.designation}</p>
                     </div>
                  </div>
                  <div className="space-y-4 max-h-[45vh] overflow-auto custom-scrollbar pr-2">
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Responsibilities</p>
                     {preview.rrCategories?.map((c: any) => (
                        <div key={c.id} className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
                           <h4 className="font-black text-white text-sm uppercase mb-2">{c.title}</h4>
                           <p className="text-sm text-slate-400 font-medium">{c.responsibilities}</p>
                        </div>
                     ))}
                  </div>
                  <div className="mt-12 flex gap-4">
                     <button onClick={() => setPreviewImmersive(false)} className="flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase text-slate-500 bg-white/5">Back to Map</button>
                     <button onClick={() => window.location.href=`/rr?userId=${preview.id}`} className="flex-[2] rounded-[1.5rem] bg-amber-600 py-5 text-xs font-black uppercase text-white shadow-xl shadow-amber-600/20">Open Neural Matrix</button>
                  </div>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}