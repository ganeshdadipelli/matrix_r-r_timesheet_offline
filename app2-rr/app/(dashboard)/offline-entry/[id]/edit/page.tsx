'use client';
// app/(dashboard)/entry/[id]/edit/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { calcInternalSum, calcExternalSum } from '@/lib/utils/calculations';
import { canEditEntry, getTimeRemaining } from '@/lib/utils/editLock';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';

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

  const [entry, setEntry]       = useState<any>(null);
  const [deps, setDeps]         = useState<Record<FieldKey,number>>({} as any);
  const [totalCount, setTotal]  = useState('');
  const [onlineCount, setOnline]= useState('');
  const [offlineCount, setOffline]= useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    apiFetch(`/api/v1/entries/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const e = d.data;
          setEntry(e);
          setTotal(String(e.totalCount));
          setOnline(String(e.onlineCount));
          setOffline(String(e.offlineCount));
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
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!entry) return;
    const t = setInterval(() => setTimeLeft(getTimeRemaining(entry.createdAt)), 60_000);
    return () => clearInterval(t);
  }, [entry]);

  useEffect(() => {
    if (totalCount && onlineCount) {
      const c = parseInt(totalCount) - parseInt(onlineCount);
      if (!isNaN(c) && c >= 0) setOffline(String(c));
    }
  }, [totalCount, onlineCount]);

  const setDep = useCallback((key: FieldKey, val: string) => {
    setDeps(p => ({ ...p, [key]: Math.max(0, parseInt(val)||0) }));
  }, []);

  if (loading) return <div className="flex justify-center p-20"><svg className="animate-spin w-6 h-6 text-primary-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg></div>;
  if (!entry) return <div className="card p-8 text-center text-slate-500">Entry not found.</div>;

  const editable = user ? canEditEntry(entry.createdAt, entry.isLocked, user.role) : false;
  const offline  = parseInt(offlineCount) || 0;
  const total    = parseInt(totalCount)   || 0;
  const online   = parseInt(onlineCount)  || 0;
  const intSum   = calcInternalSum(deps as any);
  const extSum   = calcExternalSum(deps as any);
  const depSum   = intSum + extSum;
  const depMismatch = offline > 0 && depSum !== offline;
  const canSave  = editable && !depMismatch && total > 0 && online + offline === total;

  async function handleSave() {
    setError(''); setSaving(true);
    try {
      const res = await apiFetch(`/api/v1/entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ totalCount:total, onlineCount:online, offlineCount:offline, ...deps }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update'); return; }
      router.push('/dashboard');
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Edit Entry</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {entry.district?.name} — {format(new Date(entry.date), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${editable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {editable ? `🟢 Editable — ${timeLeft}` : '🔒 Locked'}
        </div>
      </div>

      {!editable && (
        <div className="card p-6 text-center border-2 border-red-200 bg-red-50">
          <p className="text-red-700 font-semibold">Entry Locked</p>
          <p className="text-red-600 text-sm mt-1">The 12-hour edit window has passed.</p>
        </div>
      )}

      <div className="card p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Count</label>
            <input type="number" min="0" value={totalCount} onChange={e => setTotal(e.target.value)}
              disabled={!editable} className={`input-field ${!editable?'bg-slate-50 cursor-not-allowed':''}`}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Online Count</label>
            <input type="number" min="0" value={onlineCount} onChange={e => setOnline(e.target.value)}
              disabled={!editable} className={`input-field ${!editable?'bg-slate-50 cursor-not-allowed':''}`}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Offline Count</label>
            <input type="number" min="0" value={offlineCount} readOnly
              className="input-field bg-slate-50 cursor-not-allowed"/>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Internal Dependencies <span className="text-xs text-amber-600 ml-2 font-normal">Sum: {intSum}</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INT_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
              <input type="number" min="0" value={deps[f.key]??0} onChange={e => setDep(f.key, e.target.value)}
                disabled={!editable} className={`input-field text-sm ${!editable?'bg-slate-50 cursor-not-allowed':''}`}/>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4">External Dependencies <span className="text-xs text-teal-600 ml-2 font-normal">Sum: {extSum}</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXT_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
              <input type="number" min="0" value={deps[f.key]??0} onChange={e => setDep(f.key, e.target.value)}
                disabled={!editable} className={`input-field text-sm ${!editable?'bg-slate-50 cursor-not-allowed':''}`}/>
            </div>
          ))}
        </div>
      </div>

      <div className={`card p-4 border-2 ${depMismatch?'border-red-400 bg-red-50':depSum===offline&&depSum>0?'border-green-400 bg-green-50':'border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <span>Internal ({intSum}) + External ({extSum}) = {depSum}</span>
          {offline > 0 && (depMismatch
            ? <span className="text-red-600">❌ Mismatch! Offline={offline}, diff={Math.abs(depSum-offline)}</span>
            : <span className="text-green-600">✅ Matches offline ({offline})</span>)}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">❌ {error}</div>}

      <div className="flex gap-3 pb-6">
        <button onClick={handleSave} disabled={!canSave||saving} className="btn-primary px-8 py-2.5 text-sm">
          {saving?'Saving...':'Save Changes'}
        </button>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary px-6 py-2.5 text-sm">Cancel</button>
      </div>
    </div>
  );
}
