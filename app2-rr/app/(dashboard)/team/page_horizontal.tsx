'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { Expand, Eye, EyeOff, Minus, Plus, RotateCcw, X, Lock } from 'lucide-react';
import React from 'react';

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

export default function TeamPage() {
  const sessionUser = getSessionUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [scale, setScale] = useState(0.85);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [showMembers, setShowMembers] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<PreviewNode | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: -20, y: 80 });
  const [previewDragging, setPreviewDragging] = useState(false);
  const previewDragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  useEffect(() => {
    apiFetch('/api/v1/hierarchy')
      .then(res => res.json())
      .then(json => {
        if (!json.success) {
          setError(json.error || 'Failed to load organization map');
          return;
        }
        setData(json.data);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
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

  const graph = useMemo(() => {
    let roots: any[] = [];

    if (data?.type === 'self') {
      roots = [{ ...data.user, managers: [], directMembers: [] }];
    } else if (data?.type === 'manager') {
      roots = [{ ...data.self, managers: [], directMembers: data.team || [] }];
    } else if (data?.type === 'hierarchy') {
      if (data.owner) {
        roots.push({
          ...data.owner,
          managers: data.managers || [],
          directMembers: data.directMembers || [],
        });
      }
      if (data.heads && data.heads.length > 0) {
        data.heads.forEach((h: any) => {
          roots.push({
            ...h,
            managers: h.managers || [],
            directMembers: h.directMembers || [],
          });
        });
      }
    }

    const rowHeight = 96;
    const nodeW = 310;
    const nodeH = 90;
    let currentY = 80;

    const allRootLayouts: any[] = [];
    let maxX = 800; // Track widest element

    roots.forEach(root => {
      const rootStartY = currentY;
      const managerLayouts: any[] = [];
      const rootMembers = showMembers ? (root.directMembers || []) : [];

      (root.managers || []).forEach((manager: any) => {
        const managerStartY = currentY;
        const members = showMembers ? (manager.children || []) : [];
        const memberLayouts: any[] = [];

        members.forEach((member: any) => {
          memberLayouts.push({ ...member, x: 860, y: currentY });
          currentY += rowHeight;
          maxX = Math.max(maxX, 860 + nodeW);
        });

        const managerY = members.length > 0 
          ? (managerStartY + currentY - rowHeight) / 2 
          : currentY;

        if (members.length === 0) currentY += rowHeight;

        managerLayouts.push({ ...manager, x: 450, y: managerY, members: memberLayouts });
        maxX = Math.max(maxX, 450 + nodeW);
        currentY += 24; // padding between managers
      });

      const directLayouts: any[] = [];
      rootMembers.forEach((member: any) => {
        directLayouts.push({ ...member, x: 450, y: currentY });
        currentY += rowHeight;
      });

      const totalBoxHeight = currentY - rootStartY - 24;
      const rootY = totalBoxHeight > 0 ? rootStartY + totalBoxHeight / 2 : rootStartY;

      allRootLayouts.push({
        ...root,
        x: 40,
        y: rootY,
        managers: managerLayouts,
        directMembers: directLayouts,
      });

      currentY += 120; // spacing between roots
    });

    const height = Math.max(800, currentY + 100);

    return {
      width: Math.max(1400, maxX + 200),
      height,
      roots: allRootLayouts,
      nodeW,
      nodeH
    };
  }, [data, showMembers]);

  function showPreviewModal(node: any, color: 'head' | 'manager' | 'member', roleLabel: string, memberCount: number | null) {
    setPreview({
      ...node,
      color,
      roleLabel,
      memberCount,
    });
    setPreviewPos({ x: 20, y: 80 }); 
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

    const delta = e.deltaY > 0 ? -0.02 : 0.02;

    setScale(prevScale => {
       const nextScale = Math.min(1.8, Math.max(0.4, prevScale + delta));
       const worldX = (cursorX - pan.x) / prevScale;
       const worldY = (cursorY - pan.y) / prevScale;
       const nextPanX = cursorX - worldX * nextScale;
       const nextPanY = cursorY - worldY * nextScale;
       setPan({ x: nextPanX, y: nextPanY });
       return nextScale;
    });
  }

  function zoomIn() { setScale(prev => Math.min(1.8, prev + 0.1)); }
  function zoomOut() { setScale(prev => Math.max(0.4, prev - 0.1)); }
  function resetView() { setScale(0.85); setPan({ x: 50, y: 50 }); }
  
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

  const canViewRoles = (nodeId: string, nodeParentId: string | null) => {
    if (!sessionUser) return false;
    const role = sessionUser.role;
    if (['SUPER_ADMIN', 'SUPER_BOSS', 'ADMIN'].includes(role)) return true;
    if (role === 'MANAGER') return sessionUser.id === nodeId || sessionUser.id === nodeParentId;
    if (role === 'TEAM_MEMBER') return sessionUser.id === nodeId;
    return false;
  };

  if (loading) {
     return (
       <div className="flex h-screen items-center justify-center bg-[#070b12]">
         <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
       </div>
     );
  }

  if (error) {
     return (
       <div className="flex h-screen items-center justify-center bg-[#070b12]">
         <div className="card p-8 border-red-900/50 bg-red-900/10 text-red-500 font-bold max-w-lg text-center">
             {error}
         </div>
       </div>
     );
  }

  return (
    <div className="relative h-[calc(100vh-2rem)] w-full overflow-hidden rounded-3xl border border-white/5 bg-[#070b12]" ref={stageRef}>
        
       {/* Top Interactive Controls */}
       <div className="absolute right-6 top-6 z-40 flex items-center gap-1 rounded-2xl bg-[#0b111a]/80 p-2 backdrop-blur-xl border border-white/10 shadow-2xl">
          <button
             type="button"
             className={`rounded-xl p-2.5 transition hover:bg-white/10 hover:text-white ${!showMembers ? 'text-indigo-400' : 'text-slate-400'}`}
             onClick={() => setShowMembers(prev => !prev)}
             title="Toggle Team Members"
          >
             {!showMembers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <div className="w-px h-6 bg-white/10 mx-1.5" />
          <button type="button" className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={zoomOut} title="Zoom Out">
             <Minus className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={zoomIn} title="Zoom In">
             <Plus className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={resetView} title="Reset View">
             <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-xl p-2.5 bg-white/5 text-slate-300 transition hover:bg-white/15" onClick={openFullscreen} title="Full Screen">
             <Expand className="h-4 w-4" />
          </button>
       </div>

       {/* Floating Legend */}
       <div className="absolute left-6 top-6 z-40 flex items-center gap-2 rounded-2xl bg-[#0b111a]/80 p-2.5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase">
             <span className="w-2 h-2 rounded-full bg-blue-500" /> DC Head
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wider uppercase">
             <span className="w-2 h-2 rounded-full bg-indigo-500" /> Manager
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-wider uppercase">
             <span className="w-2 h-2 rounded-full bg-cyan-500" /> Team Member
          </div>
       </div>

       {/* Map Canvas */}
       <div
          className={`absolute inset-0 w-full h-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
       >
          <div
             style={{
               transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
               transformOrigin: '0 0',
               transition: dragging ? 'none' : 'transform 100ms cubic-bezier(0.2, 0, 0, 1)',
             }}
          >
             <svg
               viewBox={`0 0 ${graph.width} ${graph.height}`}
               style={{ width: graph.width, height: graph.height }}
               className="pointer-events-none" // Events happen on HTML elements
             >
                {/* Draw curved connecting lines */}
                {graph.roots.map((root, rootIdx) => (
                   <g key={`lines-${rootIdx}`}>
                      {/* Root -> Manager lines */}
                      {root.managers.map((mgr: any) => (
                         <path 
                           key={`path-mgr-${mgr.id}`}
                           d={`M ${root.x + graph.nodeW} ${root.y + graph.nodeH / 2} C ${root.x + graph.nodeW + 45} ${root.y + graph.nodeH / 2}, ${mgr.x - 45} ${mgr.y + graph.nodeH / 2}, ${mgr.x} ${mgr.y + graph.nodeH / 2}`}
                           fill="none" stroke="#2563eb" strokeWidth="2.5" strokeOpacity="0.4"
                         />
                      ))}
                      {/* Root -> Direct Members lines */}
                      {root.directMembers.map((mem: any) => (
                         <path 
                           key={`path-dmem-${mem.id}`}
                           d={`M ${root.x + graph.nodeW} ${root.y + graph.nodeH / 2} C ${root.x + graph.nodeW + 45} ${root.y + graph.nodeH / 2}, ${mem.x - 45} ${mem.y + graph.nodeH / 2}, ${mem.x} ${mem.y + graph.nodeH / 2}`}
                           fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeOpacity="0.3" strokeDasharray="5,5"
                         />
                      ))}
                      {/* Manager -> Members lines */}
                      {root.managers.map((mgr: any) => 
                         mgr.members.map((mem: any) => (
                            <path 
                              key={`path-mem-${mem.id}`}
                              d={`M ${mgr.x + graph.nodeW} ${mgr.y + graph.nodeH / 2} C ${mgr.x + graph.nodeW + 45} ${mgr.y + graph.nodeH / 2}, ${mem.x - 45} ${mem.y + graph.nodeH / 2}, ${mem.x} ${mem.y + graph.nodeH / 2}`}
                              fill="none" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.4"
                            />
                         ))
                      )}
                   </g>
                ))}
             </svg>

             {/* Render HTML Nodes overlaying the SVG */}
             {graph.roots.map((root, rootIdx) => (
                <React.Fragment key={`nodes-${rootIdx}`}>
                   {/* Root HTML */}
                   <div 
                      className="absolute rounded-2xl flex flex-col justify-center px-6 transition-transform hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_rgba(37,99,235,0.4)] pointer-events-auto shadow-2xl border border-blue-400/50 cursor-pointer overflow-hidden group"
                      style={{ 
                         left: root.x, top: root.y, width: graph.nodeW, height: graph.nodeH,
                         background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.95))'
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => showPreviewModal(root, 'head', 'DC Head', root.managers.length + root.directMembers.length)}
                   >
                      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                      <div className="relative z-10 w-full">
                         <h3 className="text-lg font-black text-white truncate drop-shadow-sm">{root.name}</h3>
                         <div className="mt-1 flex items-center justify-between">
                            <p className="text-xs font-semibold tracking-wider text-blue-100 uppercase truncate max-w-[150px]">{root.designation || 'DC Head'}</p>
                            <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                               {root.managers.length} Sub
                            </span>
                         </div>
                      </div>
                   </div>

                   {/* Managers HTML */}
                   {root.managers.map((mgr: any) => (
                      <div 
                         key={`mgr-${mgr.id}`}
                         className="absolute rounded-2xl flex flex-col justify-center px-6 transition-transform hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_rgba(99,102,241,0.3)] pointer-events-auto border border-indigo-400/30 cursor-pointer overflow-hidden group shadow-xl"
                         style={{ 
                            left: mgr.x, top: mgr.y, width: graph.nodeW, height: graph.nodeH,
                            background: 'linear-gradient(135deg, rgba(79,70,229,0.95), rgba(99,102,241,0.95))'
                         }}
                         onMouseDown={(e) => e.stopPropagation()}
                         onClick={() => showPreviewModal(mgr, 'manager', 'Manager', mgr.members.length)}
                      >
                         <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>
                         <div className="relative z-10 w-full">
                            <h3 className="text-base font-bold text-white truncate drop-shadow-sm">{mgr.name}</h3>
                            <div className="mt-1.5 flex items-center justify-between">
                               <p className="text-xs font-medium tracking-wide text-indigo-100 truncate max-w-[150px]">{mgr.designation || 'Manager'}</p>
                               <span className="bg-indigo-900/40 border border-indigo-300/20 text-indigo-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-sm">
                                  {mgr.members.length} Mems
                               </span>
                            </div>
                         </div>
                      </div>
                   ))}

                   {/* Direct Members HTML */}
                   {root.directMembers.map((mem: any) => (
                      <div 
                         key={`dmem-${mem.id}`}
                         className="absolute rounded-2xl flex flex-col justify-center px-6 transition-transform hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_rgba(6,182,212,0.3)] pointer-events-auto border border-cyan-500/20 cursor-pointer group shadow-lg"
                         style={{ 
                            left: mem.x, top: mem.y, width: graph.nodeW, height: graph.nodeH,
                            background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))'
                         }}
                         onMouseDown={(e) => e.stopPropagation()}
                         onClick={() => showPreviewModal(mem, 'member', 'Team Member', 0)}
                      >
                         <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500 rounded-l-2xl"></div>
                         <div className="relative z-10 w-full pl-2">
                            <h3 className="text-sm font-semibold text-slate-100 truncate">{mem.name}</h3>
                            <div className="mt-1 flex items-center justify-between">
                               <p className="text-[11px] text-slate-400 capitalize truncate max-w-[160px]">{mem.designation || 'Team Member'}</p>
                            </div>
                         </div>
                      </div>
                   ))}

                   {/* Managers' Members HTML */}
                   {root.managers.map((mgr: any) => 
                      mgr.members.map((mem: any) => (
                         <div 
                            key={`mem-${mem.id}`}
                            className="absolute rounded-xl flex flex-col justify-center px-5 transition-colors hover:bg-[#1e293b] pointer-events-auto border border-slate-700/50 cursor-pointer group shadow-md"
                            style={{ 
                               left: mem.x, top: mem.y, width: graph.nodeW, height: graph.nodeH - 10,
                               background: '#0f172a'
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => showPreviewModal(mem, 'member', 'Team Member', 0)}
                         >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-600 rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative w-full pl-2">
                               <h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-300 transition-colors">{mem.name}</h3>
                               <p className="mt-0.5 text-[11px] text-slate-500 capitalize truncate w-full">{mem.designation || 'ITMS'}</p>
                            </div>
                         </div>
                      ))
                   )}
                </React.Fragment>
             ))}
          </div>
       </div>

       {/* Draggable Preview Modal */}
       {preview && (
          <div
             className={`absolute z-50 w-[420px] rounded-[2rem] border border-white/10 bg-[#070b12]/95 p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl ${previewDragging ? 'cursor-grabbing scale-[1.02]' : 'cursor-grab scale-100'} transition-transform duration-75`}
             style={{ transform: `translate(${previewPos.x}px, ${previewPos.y}px)` }}
             onMouseDown={handlePreviewMouseDown}
          >
             <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                   <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase border ${
                      preview.color === 'head' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 
                      preview.color === 'manager' ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' : 
                      'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                   }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${preview.color === 'head' ? 'bg-blue-400' : preview.color === 'manager' ? 'bg-indigo-400' : 'bg-cyan-400'}`} />
                      {preview.roleLabel}
                   </p>
                   <h3 className="mt-4 text-2xl font-black text-white tracking-tight">{preview.name}</h3>
                   <p className="mt-1.5 text-sm font-medium text-slate-400">{preview.designation || preview.roleLabel}</p>
                </div>

                <button
                   type="button"
                   onClick={(e) => { e.stopPropagation(); setPreview(null); }}
                   className="rounded-full bg-white/5 p-2 text-slate-400 transition hover:bg-white/15 hover:text-white mt-1"
                   onMouseDown={(e) => e.stopPropagation()}
                >
                   <X className="h-4 w-4" />
                </button>
             </div>

             <div className="mt-6 grid grid-cols-2 gap-3" onMouseDown={e => e.stopPropagation()}>
                <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Roles</p>
                   <p className="mt-1 text-3xl font-black text-slate-100">{preview.rrCategories?.length || 0}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                      {preview.color === 'member' ? 'Access' : 'Reports'}
                   </p>
                   <p className="mt-1 text-3xl font-black text-slate-100">
                      {preview.color === 'member' ? 'Assigned' : preview.memberCount || 0}
                   </p>
                </div>
             </div>

             {canViewRoles(preview.id, preview.parentId) ? (
                <div className="mt-7" onMouseDown={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Key Responsibilities</p>
                      <span className="text-xs text-slate-500 font-medium">{preview.rrCategories?.length || 0} items</span>
                   </div>
                   <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2 pb-2">
                      {!preview.rrCategories || preview.rrCategories.length === 0 ? (
                         <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-5 text-center text-sm font-medium text-slate-500">
                            No key responsibilities assigned
                         </div>
                      ) : (
                         preview.rrCategories.map((item: any) => (
                            <div key={item.id} className="rounded-2xl border border-white/5 bg-slate-900 p-4 transition-colors hover:bg-slate-800">
                               <p className="font-bold leading-snug text-slate-200">{item.title}</p>
                               <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                                  {item.responsibilities.length > 140
                                     ? `${item.responsibilities.slice(0, 140)}...`
                                     : item.responsibilities}
                               </p>
                            </div>
                         ))
                      )}
                   </div>

                   <div className="mt-5 pt-3 border-t border-white/5 flex gap-3">
                      <button
                         type="button"
                         className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-[13px] font-bold tracking-wide text-white shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)] transition hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
                         onClick={() => openRoleMatrix(preview.id)}
                      >
                         Open Role Matrix
                      </button>
                   </div>
                </div>
             ) : (
                <div className="mt-7 rounded-2xl border border-red-900/30 bg-red-950/20 p-6 text-center" onMouseDown={e => e.stopPropagation()}>
                   <Lock className="h-6 w-6 text-red-500/70 mx-auto mb-3" />
                   <p className="text-sm font-bold text-red-400">Restricted Access</p>
                   <p className="mt-1 text-xs text-red-300/70">You do not have permission to view responsibilities for this organizational unit.</p>
                </div>
             )}
          </div>
       )}
    </div>
  );
}