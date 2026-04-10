'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import {
  Expand, Eye, EyeOff, Minus, Plus, RotateCcw, X, Lock,
  Menu as MenuIcon, GitBranch, Briefcase, ChevronDown, Maximize,
  Shield, Users, Zap, Award
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

  /* preview modal */
  const [preview, setPreview] = useState<PreviewNode | null>(null);

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
    }
    function onUp() { setDragging(false); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.preview-modal')) return;
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setScale(prev => Math.min(2.0, Math.max(0.12, prev + delta)));
  };

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.node-card')) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  /* ── Stats Aggregation ───────────────────────────────── */
  const stats = useMemo(() => {
    let heads = 0, managers = 0, members = 0, roles = 0;
    if (!data) return { heads, managers, members, roles };
    const allRoots = data.roots || (data.owner ? [data] : []);
    
    const countUser = (u: any) => { roles += u?.rrCategories?.length || 0; };

    allRoots.forEach((rootObj: any) => {
      heads++; countUser(rootObj.owner);
      rootObj.managers?.forEach((mgr: any) => {
        managers++; countUser(mgr);
        mgr.children?.forEach((c: any) => { members++; countUser(c); });
      });
      rootObj.directMembers?.forEach((dm: any) => { members++; countUser(dm); });
      rootObj.heads?.forEach((sh: any) => {
        heads++; countUser(sh);
        sh.managers?.forEach((m: any) => { managers++; countUser(m); });
        sh.directMembers?.forEach((d: any) => { members++; countUser(d); });
      });
    });
    return { heads, managers, members, roles };
  }, [data]);

  /* ── Premium Layout Engine ────────────────────────── */
  const graph = useMemo(() => {
    const rootGroups = data?.type === 'hierarchy' ? (data.roots || [data]) : [];
    const NW = 340;      
    const NH = 100;      
    const MH = 72;       
    const COL_GAP = 48;  
    const ROW_GAP = 140; 
    const MEM_GAP = 16; 

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

      const primaryBranches = [
        ...(group.managers || []).map((m: any) => ({ ...m, type: 'MANAGER', items: m.children || [] })),
        ...(group.heads || []).map((h: any) => ({ ...h, type: 'HEAD', items: h.directMembers || [] }))
      ];

      primaryBranches.forEach((branch: any) => {
        const branchX = managerCursorX;
        const branchY = NH + ROW_GAP;

        const memberLayouts = (showMembers ? branch.items : []).map((mem: any, idx: number) => {
          const memY = branchY + NH + 50 + idx * (MH + MEM_GAP);
          maxContentY = Math.max(maxContentY, memY + MH + 300);
          return { ...mem, x: branchX, y: memY };
        });

        if (branch.type === 'MANAGER') {
          groupManagers.push({ ...branch, x: branchX, y: branchY, members: memberLayouts });
        } else {
          groupHeads.push({ ...branch, x: branchX, y: branchY, directMembers: memberLayouts });
        }
        managerCursorX += NW + COL_GAP;
      });

      if (group.directMembers?.length > 0) {
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
      groupCursorX = managerCursorX + 300; 
    });

    return { width: groupCursorX, height: maxContentY, roots: rootLayouts, NW, NH, MH };
  }, [data, showMembers]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#03060a]">
      <div className="relative h-20 w-20">
         <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
         <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
         <Zap className="absolute inset-0 m-auto h-8 w-8 text-blue-500 animate-pulse" />
      </div>
    </div>
  );

  const { roots, NW, NH, MH } = graph;

  return (
    <div ref={stageRef} onWheel={handleWheel} className="relative h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[3rem] border border-white/10 bg-[#020408] selection:bg-blue-500/30">
      
      {/* ── Background Grid Architecture ── */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] to-transparent pointer-events-none" />

      {/* ── Dashboard UI ── */}
      {showUI && (
        <>
          <div className="pointer-events-none absolute left-10 top-10 z-50 w-[340px] animate-in slide-in-from-left-10 duration-500">
             <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/60 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                <div className="bg-gradient-to-r from-blue-600/20 to-transparent p-7 border-b border-white/5">
                   <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                         <GitBranch className="h-6 w-6" />
                      </div>
                      <div>
                         <h2 className="text-xl font-black text-white tracking-tight">Organization Map</h2>
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/80 mt-1">Strategic Command</p>
                      </div>
                   </div>
                </div>
                <div className="p-7 grid grid-cols-2 gap-4">
                   {[
                     { label: 'Strategic Heads', val: stats.heads, c: 'text-blue-400', bg: 'bg-blue-500/10' },
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

          <div className="pointer-events-none absolute left-10 bottom-10 z-50 flex items-center gap-3 animate-in slide-in-from-bottom-10">
             {['DC Head', 'Manager', 'Specialist'].map((l, i) => (
                <div key={l} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-2xl shadow-xl">
                   <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_15px_currentColor] ${i === 0 ? 'text-blue-500 bg-blue-500' : i === 1 ? 'text-indigo-500 bg-indigo-500' : 'text-cyan-500 bg-cyan-500'}`} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{l}</span>
                </div>
             ))}
          </div>
        </>
      )}

      {/* ── Control Console ── */}
      <div className="absolute right-10 top-10 z-50 flex items-start gap-4">
        {menuOpen && (
          <div className="flex items-center gap-1 rounded-3xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-3xl animate-in slide-in-from-right-8 duration-300">
            <button className={`rounded-2xl p-4 transition-all hover:bg-white/10 ${showMembers ? 'text-blue-500' : 'text-slate-500'}`} onClick={() => setShowMembers(!showMembers)} title="Toggle Visibility">
              {showMembers ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
            <button className={`rounded-2xl p-4 transition-all hover:bg-white/10 ${showUI ? 'text-emerald-500' : 'text-slate-500'}`} onClick={() => setShowUI(!showUI)} title="Dashboard Toggle">
              <Zap className="h-5 w-5" />
            </button>
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={toggleFullScreen} title="Immersive Mode"><Maximize className="h-5 w-5" /></button>
            <div className="mx-2 h-8 w-px bg-white/10" />
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={() => setScale(s => Math.max(0.1, s - 0.1))}><Minus className="h-5 w-5" /></button>
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={() => setScale(s => Math.min(2.0, s + 0.1))}><Plus className="h-5 w-5" /></button>
            <button className="rounded-2xl p-4 text-slate-300 transition-all hover:bg-white/10" onClick={() => { setScale(0.85); setPan({ x: 120, y: 80 }); }}><RotateCcw className="h-5 w-5" /></button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:scale-105 active:scale-95"
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
          
          {/* Radiant Path Layer */}
          <svg width={graph.width + 2000} height={graph.height + 2000} className="absolute pointer-events-none">
            <defs>
               <linearGradient id="lineGradHead" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
               </linearGradient>
            </defs>
            {roots.map((root: any) => (
              <g key={`rays-${root.id}`}>
                {[...root.managers, ...root.heads].map((leader: any) => (
                  <React.Fragment key={`L-GRP-${leader.id}`}>
                    {/* Glowing Core Path */}
                    <path 
                      d={`M${root.x + NW/2} ${root.y + NH} C${root.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${leader.y}`} 
                      stroke="url(#lineGradHead)" strokeWidth="4" fill="none" opacity="0.6" strokeLinecap="round"
                    />
                    <path 
                      d={`M${root.x + NW/2} ${root.y + NH} C${root.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${(root.y+NH+leader.y)/2}, ${leader.x + NW/2} ${leader.y}`} 
                      stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.8" strokeLinecap="round"
                    />
                    {/* Manager to Member Paths */}
                    {(leader.members || leader.directMembers || []).map((mem: any) => (
                       <path 
                         key={`MPATH-${mem.id}`}
                         d={`M${leader.x + NW/2} ${leader.y + NH} C${leader.x + NW/2} ${(leader.y + NH + mem.y) / 2}, ${mem.x + NW/2} ${(leader.y + NH + mem.y) / 2}, ${mem.x + NW/2} ${mem.y}`}
                         stroke={leader.role === 'SUPER_BOSS' ? '#3b82f6' : '#6366f1'} 
                         strokeWidth="1.5" fill="none" opacity="0.15" strokeLinecap="round"
                       />
                    ))}
                  </React.Fragment>
                ))}
              </g>
            ))}
          </svg>

          {/* Aura Node Layer */}
          {roots.map((root: any) => (
            <React.Fragment key={root.id}>
              {/* DC Head Card */}
              <div 
                className="node-card absolute flex flex-col justify-center rounded-[2.5rem] bg-[#0c1424] border-2 border-blue-500/40 p-8 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] transition-all hover:scale-[1.03] group hover:border-blue-400 hover:shadow-[0_0_60px_-10px_rgba(59,130,246,0.6)]"
                style={{ left: root.x, top: root.y, width: NW, height: NH }}
                onClick={() => setPreview({ ...root, color: 'head', roleLabel: 'Strategic DC Head', memberCount: (root.managers?.length || 0) + (root.heads?.length || 0) })}
              >
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-blue-600 rounded-full px-5 py-1.5 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-blue-500/40">
                   {(root.managers?.length || 0) + (root.heads?.length || 0)} Branches Attached
                </div>
                <div className="flex items-center gap-5">
                   <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-xl shadow-blue-600/20 group-hover:rotate-6 transition-transform">
                      <Shield className="h-7 w-7" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white tracking-tight leading-none group-hover:text-blue-400 transition-colors uppercase">{root.name}</h3>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-blue-500 opacity-80">{root.designation || 'Head of Department'}</p>
                   </div>
                </div>
              </div>

              {/* Manager/Sub-Head Cards */}
              {[...root.managers, ...root.heads].map((leader: any) => (
                <div key={leader.id}
                  className={`node-card absolute flex flex-col justify-center rounded-[2rem] bg-[#0c1424] border-2 p-8 shadow-2xl transition-all hover:scale-[1.03] group ${
                    leader.role === 'SUPER_BOSS' ? 'border-blue-500/30' : 'border-indigo-500/30'
                  }`}
                  style={{ left: leader.x, top: leader.y, width: NW, height: NH }}
                  onClick={() => setPreview({ ...leader, color: leader.role === 'SUPER_BOSS' ? 'head' : 'manager', roleLabel: leader.role === 'SUPER_BOSS' ? 'Strategic Head' : 'Operations Manager', memberCount: (leader.members || leader.directMembers || []).length })}
                >
                  <div className={`absolute top-0 right-10 -translate-y-1/2 rounded-full px-4 py-1 text-[9px] font-black text-white uppercase tracking-widest shadow-lg ${
                    leader.role === 'SUPER_BOSS' ? 'bg-blue-600 shadow-blue-600/20' : 'bg-indigo-600 shadow-indigo-600/20'
                  }`}>
                    {(leader.members || leader.directMembers || []).length} Specialists
                  </div>
                  <div className="flex items-center gap-5">
                     <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white transition-all group-hover:scale-110 ${
                        leader.role === 'SUPER_BOSS' ? 'bg-blue-600' : 'bg-indigo-600'
                     }`}>
                        <Users className="h-6 w-6" />
                     </div>
                     <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-black text-white tracking-tight leading-none truncate group-hover:text-indigo-400 transition-colors uppercase">{leader.name}</h3>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate">{leader.designation || 'Operations Unit'}</p>
                     </div>
                  </div>
                </div>
              ))}

              {/* Specialist List (Modern Rows) */}
              {[...root.managers.flatMap((m: any) => m.members), ...root.heads.flatMap((h: any) => h.directMembers)].map((mem: any) => (
                <div key={mem.id}
                  className="node-card absolute flex items-center rounded-2xl bg-[#0d121d] border border-white/5 pl-5 pr-6 py-4 shadow-sm hover:bg-[#161d2b] hover:border-cyan-500/50 transition-all hover:scale-[1.02] cursor-pointer group"
                  style={{ left: mem.x, top: mem.y, width: NW, height: MH }}
                  onClick={() => setPreview({ ...mem, color: 'member', roleLabel: 'Tactical Specialist', memberCount: 0 })}
                >
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                     {mem.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <p className="text-[15px] font-black text-slate-100 truncate tracking-tight">{mem.name}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-500 mt-1 tracking-widest group-hover:text-cyan-500 transition-colors">{mem.designation || 'ITMS Expert'}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-700 opacity-20 group-hover:opacity-100 group-hover:text-cyan-500" />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Immersive Detail Modal ── */}
      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in transition-all" onClick={() => setPreview(null)}>
           <div className="w-[480px] bg-[#0b0c10] rounded-[3rem] p-10 border-2 border-white/10 relative shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPreview(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white bg-white/5 p-3 rounded-2xl transition-all hover:rotate-90"><X className="h-6 w-6" /></button>
              
              <div className="flex items-center gap-7 mb-10">
                 <div className={`h-20 w-20 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl ${
                   preview.color === 'head' ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/30' : 
                   preview.color === 'manager' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/30' :
                   'bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-cyan-500/30'
                 }`}>
                   {preview.name.charAt(0)}
                </div>
                <div className="flex-1">
                   <h3 className="text-3xl font-black text-white leading-none tracking-tight uppercase">{preview.name}</h3>
                   <div className="flex items-center gap-2 mt-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{preview.roleLabel}</span>
                      <div className="h-1 w-1 rounded-full bg-slate-600" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{preview.designation || 'Core Unit'}</span>
                   </div>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[40vh] overflow-auto pr-3 custom-scrollbar">
                 <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-1">Responsibility Matrix</p>
                 {preview.rrCategories?.map((c: any) => (
                   <div key={c.id} className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-all">
                      <div className="flex items-center gap-3 mb-3">
                         <div className="h-2 w-2 rounded-full bg-blue-500" />
                         <h4 className="font-black text-white text-sm uppercase tracking-tight">{c.title}</h4>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">{c.responsibilities}</p>
                   </div>
                 ))}
                 {(!preview.rrCategories || preview.rrCategories.length === 0) && (
                   <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                      <Award className="h-10 w-10 text-slate-700 mx-auto mb-4 opacity-40" />
                      <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No Matrix Data Assigned</p>
                   </div>
                 )}
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setPreview(null)} className="flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all">Back to Map</button>
                 <button onClick={() => window.location.href=`/rr?userId=${preview.id}`} className="flex-[2] rounded-[1.5rem] bg-blue-600 py-5 text-xs font-black uppercase tracking-widest text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 active:scale-95">Open Neural Matrix</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}