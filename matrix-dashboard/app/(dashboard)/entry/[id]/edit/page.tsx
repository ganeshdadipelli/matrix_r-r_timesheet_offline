'use client';
// app/(dashboard)/entry/[id]/edit/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { calcInternalSum, calcExternalSum } from '@/lib/utils/calculations';
import { canEditEntry, getTimeRemaining } from '@/lib/utils/editLock';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { CheckCircle2, XCircle, Save, X, AlertTriangle, Loader2, Lock, Clock, RefreshCw } from 'lucide-react';

type FieldKey =
  'cat6Cable'|'threeCorepower'|'gponIssues'|'ofcIssues'|'cameraStoreReplacement'|
  'camerasFluctuating'|'needToCheck'|'fiberRequired'|'hydraLadder'|'mcbIssue'|'switch8portIssue'|
  'roadExtensionConstruction'|'noOlt'|'popDown'|'jbAccident'|'renovation'|
  'powerDisconnection'|'dgpOffice'|'needPeerIp';

const INT_FIELDS: {key:FieldKey;label:string}[] = [
  {key:'cat6Cable',label:'CAT 6 Cable'},{key:'threeCorepower',label:'3 Core Power Cable'},
  {key:'gponIssues',label:'GPON Issues'},{key:'ofcIssues',label:'OFC Issues'},
  {key:'cameraStoreReplacement',label:'Camera Store / Replacement'},
  {key:'camerasFluctuating',label:'Cameras Fluctuating'},{key:'needToCheck',label:'Need to Check'},
  {key:'fiberRequired',label:'Fiber Required'},{key:'hydraLadder',label:'Hydra Ladder'},
  {key:'mcbIssue',label:'MCB Issue'},{key:'switch8portIssue',label:'8 Port Switch Issue'},
];
const EXT_FIELDS: {key:FieldKey;label:string}[] = [
  {key:'roadExtensionConstruction',label:'Road Extension / Construction'},{key:'noOlt',label:'No OLT'},
  {key:'popDown',label:'Pop Down'},{key:'jbAccident',label:'JB Accident'},
  {key:'renovation',label:'Renovation'},{key:'powerDisconnection',label:'Power Disconnections / Raw Power'},
  {key:'dgpOffice',label:'DGP Office'},{key:'needPeerIp',label:'Need Peer IP'},
];

export default function EditEntryPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const user = getSessionUser();

  const [entry, setEntry]         = useState<any>(null);
  const [deps, setDeps]           = useState<Record<FieldKey,number>>({} as any);
  const [totalCount, setTotal]    = useState('');
  const [onlineCount, setOnline]  = useState('');
  const [offlineCount, setOffline]= useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [timeLeft, setTimeLeft]   = useState('');

  useEffect(() => {
    apiFetch(`/api/v1/entries/${id}`).then(r=>r.json()).then(d=>{
      if (d.success) {
        const e = d.data;
        setEntry(e);
        setTotal(String(e.totalCount)); setOnline(String(e.onlineCount)); setOffline(String(e.offlineCount));
        setDeps({
          cat6Cable:e.cat6Cable, threeCorepower:e.threeCorepower, gponIssues:e.gponIssues,
          ofcIssues:e.ofcIssues, cameraStoreReplacement:e.cameraStoreReplacement,
          camerasFluctuating:e.camerasFluctuating, needToCheck:e.needToCheck,
          fiberRequired:e.fiberRequired, hydraLadder:e.hydraLadder, mcbIssue:e.mcbIssue,
          switch8portIssue:e.switch8portIssue, roadExtensionConstruction:e.roadExtensionConstruction,
          noOlt:e.noOlt, popDown:e.popDown, jbAccident:e.jbAccident, renovation:e.renovation,
          powerDisconnection:e.powerDisconnection, dgpOffice:e.dgpOffice, needPeerIp:e.needPeerIp,
        });
        setTimeLeft(getTimeRemaining(e.createdAt));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!entry) return;
    const t = setInterval(()=>setTimeLeft(getTimeRemaining(entry.createdAt)), 60_000);
    return ()=>clearInterval(t);
  }, [entry]);

  useEffect(() => {
    if (totalCount && onlineCount) {
      const c = parseInt(totalCount) - parseInt(onlineCount);
      if (!isNaN(c) && c >= 0) setOffline(String(c));
    }
  }, [totalCount, onlineCount]);

  const setDep = useCallback((key: FieldKey, val: string) => {
    setDeps(p=>({...p,[key]:Math.max(0,parseInt(val)||0)}));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-24 gap-4">
      <RefreshCw className="w-7 h-7 animate-spin text-matrix-slate/40" />
      <p className="text-matrix-cloud/30 text-sm">Loading entry…</p>
    </div>
  );
  if (!entry) return (
    <div className="card p-10 text-center text-matrix-cloud/40">Entry not found.</div>
  );

  const editable   = user ? canEditEntry(entry.createdAt, entry.isLocked, user.role) : false;
  const offline    = parseInt(offlineCount)||0;
  const total      = parseInt(totalCount)||0;
  const online     = parseInt(onlineCount)||0;
  const intSum     = calcInternalSum(deps as any);
  const extSum     = calcExternalSum(deps as any);
  const depSum     = intSum + extSum;
  const depMismatch = offline>0 && depSum!==offline;
  const canSave    = editable && !depMismatch && total>0 && online+offline===total;

  async function handleSave() {
    setError(''); setSaving(true);
    try {
      const res  = await apiFetch(`/api/v1/entries/${id}`, {
        method:'PUT', body:JSON.stringify({ totalCount:total, onlineCount:online, offlineCount:offline, ...deps }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error||'Failed to update'); return; }
      router.push('/dashboard');
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  }

  const labelClass = "block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5";
  const inputDisabled = "opacity-40 cursor-not-allowed";

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="section-title">Edit Entry</h2>
          <p className="section-subtitle">
            {entry.district?.name} · {format(new Date(entry.date), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
          style={editable
            ? { background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#6EE7B7' }
            : { background:'rgba(239,68,68,0.1)',  border:'1px solid rgba(239,68,68,0.2)',  color:'#FCA5A5' }
          }>
          {editable ? <><Clock className="w-3.5 h-3.5" /> {timeLeft}</> : <><Lock className="w-3.5 h-3.5" /> Locked</>}
        </div>
      </div>

      {!editable && (
        <div className="card p-6 text-center animate-fade-in"
          style={{ borderColor:'rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)' }}>
          <Lock className="w-10 h-10 text-red-400/30 mx-auto mb-2" />
          <p className="text-red-300 font-semibold">Entry Locked</p>
          <p className="text-red-400/50 text-sm mt-1">The 12-hour edit window has passed. This entry is read-only.</p>
        </div>
      )}

      {/* Counts */}
      <div className="card p-5">
        <h3 className="font-semibold text-matrix-cream font-display mb-4">Camera Counts</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Total Count</label>
            <input type="number" min="0" value={totalCount} onChange={e=>setTotal(e.target.value)}
              disabled={!editable} className={`input-field ${!editable?inputDisabled:''}`} />
          </div>
          <div>
            <label className={labelClass}>Online Count</label>
            <input type="number" min="0" value={onlineCount} onChange={e=>setOnline(e.target.value)}
              disabled={!editable} className={`input-field ${!editable?inputDisabled:''}`} />
          </div>
          <div>
            <label className={labelClass}>Offline Count</label>
            <input type="number" min="0" value={offlineCount} readOnly
              className="input-field cursor-not-allowed font-bold text-red-400"
              style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }} />
          </div>
        </div>
      </div>

      {/* Internal deps */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-semibold text-matrix-cream font-display">Internal Dependencies</h3>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background:'rgba(214,163,138,0.15)', color:'#D6A38A', border:'1px solid rgba(214,163,138,0.25)' }}>
            Sum: {intSum}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INT_FIELDS.map(f=>(
            <div key={f.key}>
              <label className={labelClass}>{f.label}</label>
              <input type="number" min="0" value={deps[f.key]??0} onChange={e=>setDep(f.key,e.target.value)}
                disabled={!editable} className={`input-field text-sm ${!editable?inputDisabled:''}`} />
            </div>
          ))}
        </div>
      </div>

      {/* External deps */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-semibold text-matrix-cream font-display">External Dependencies</h3>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background:'rgba(95,111,125,0.15)', color:'#A3ADB5', border:'1px solid rgba(95,111,125,0.25)' }}>
            Sum: {extSum}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXT_FIELDS.map(f=>(
            <div key={f.key}>
              <label className={labelClass}>{f.label}</label>
              <input type="number" min="0" value={deps[f.key]??0} onChange={e=>setDep(f.key,e.target.value)}
                disabled={!editable} className={`input-field text-sm ${!editable?inputDisabled:''}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Validation */}
      <div className="card p-4"
        style={{
          borderColor: depMismatch ? 'rgba(239,68,68,0.4)' : depSum===offline&&depSum>0 ? 'rgba(16,185,129,0.4)' : undefined,
          background: depMismatch ? 'rgba(239,68,68,0.05)' : depSum===offline&&depSum>0 ? 'rgba(16,185,129,0.05)' : undefined,
        }}>
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <span className="text-matrix-cloud/60">
            Internal ({intSum}) + External ({extSum}) = <strong className="text-matrix-cream">{depSum}</strong>
          </span>
          {offline > 0 && (depMismatch
            ? <span className="flex items-center gap-1 text-red-400 font-bold">
                <XCircle className="w-4 h-4"/> Mismatch! Offline={offline}, diff={Math.abs(depSum-offline)}
              </span>
            : <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4"/> Matches offline ({offline})
              </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg flex items-center gap-2 text-sm animate-fade-in"
          style={{ background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <XCircle className="w-4 h-4 text-red-400 shrink-0"/><span className="text-red-300">{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={!canSave||saving}
          className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-40">
          {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:<><Save className="w-4 h-4"/>Save Changes</>}
        </button>
        <button onClick={()=>router.push('/dashboard')} className="btn-ghost px-6 py-2.5 flex items-center gap-2">
          <X className="w-4 h-4"/> Cancel
        </button>
      </div>
    </div>
  );
}
