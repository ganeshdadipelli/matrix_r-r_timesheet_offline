'use client';
// app/(dashboard)/entry/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { calcInternalSum, calcExternalSum } from '@/lib/utils/calculations';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import {
  CheckCircle2, XCircle, Save, RotateCcw, X,
  AlertTriangle, Loader2, Plus, Trash2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// NumberInput MUST be defined OUTSIDE the parent component.
// If defined inside, React recreates it every render → focus lost.
// ─────────────────────────────────────────────────────────────────
interface NumInputProps {
  value: number;
  fieldKey: string;
  onChange: (key: string, val: string) => void;
}
function NumInput({ value, fieldKey, onChange }: NumInputProps) {
  return (
    <input
      type="number"
      min="0"
      inputMode="numeric"
      id={fieldKey}
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={e => onChange(fieldKey, e.target.value)}
      className="input-field text-sm"
    />
  );
}

interface District { id: string; name: string; code: string; }

type BuiltinKey =
  'cat6Cable'|'threeCorepower'|'gponIssues'|'ofcIssues'|'cameraStoreReplacement'|
  'camerasFluctuating'|'needToCheck'|'fiberRequired'|'hydraLadder'|'mcbIssue'|'switch8portIssue'|
  'roadExtensionConstruction'|'noOlt'|'popDown'|'jbAccident'|'renovation'|
  'powerDisconnection'|'dgpOffice'|'needPeerIp';

const INT_FIELDS: { key: BuiltinKey; label: string }[] = [
  { key:'cat6Cable',              label:'CAT 6 Cable' },
  { key:'threeCorepower',         label:'3 Core Power Cable' },
  { key:'gponIssues',             label:'GPON Issues' },
  { key:'ofcIssues',              label:'OFC Issues' },
  { key:'cameraStoreReplacement', label:'Camera Store / Replacement' },
  { key:'camerasFluctuating',     label:'Cameras Fluctuating' },
  { key:'needToCheck',            label:'Need to Check' },
  { key:'fiberRequired',          label:'Fiber Required' },
  { key:'hydraLadder',            label:'Hydra Ladder' },
  { key:'mcbIssue',               label:'MCB Issue' },
  { key:'switch8portIssue',       label:'8 Port Switch Issue' },
];
const EXT_FIELDS: { key: BuiltinKey; label: string }[] = [
  { key:'roadExtensionConstruction', label:'Road Extension / Construction' },
  { key:'noOlt',             label:'No OLT' },
  { key:'popDown',           label:'Pop Down' },
  { key:'jbAccident',        label:'JB Accident' },
  { key:'renovation',        label:'Renovation' },
  { key:'powerDisconnection',label:'Power Disconnections / Raw Power' },
  { key:'dgpOffice',         label:'DGP Office' },
  { key:'needPeerIp',        label:'Need Peer IP' },
];

type BuiltinDeps = Record<BuiltinKey, number>;
const emptyBuiltin = (): BuiltinDeps => ({
  cat6Cable:0, threeCorepower:0, gponIssues:0, ofcIssues:0, cameraStoreReplacement:0,
  camerasFluctuating:0, needToCheck:0, fiberRequired:0, hydraLadder:0, mcbIssue:0, switch8portIssue:0,
  roadExtensionConstruction:0, noOlt:0, popDown:0, jbAccident:0, renovation:0,
  powerDisconnection:0, dgpOffice:0, needPeerIp:0,
});

// Custom dependency row
interface CustomDep { id: string; label: string; value: number; }
let customIdCounter = 0;
function makeCustomId() { return `custom_${++customIdCounter}_${Date.now()}`; }

export default function EntryPage() {
  const router = useRouter();
  const [districts, setDistricts]       = useState<District[]>([]);
  const [districtId, setDistrictId]     = useState('');
  const [date, setDate]                 = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalCount, setTotalCount]     = useState('');
  const [onlineCount, setOnlineCount]   = useState('');
  const [offlineCount, setOfflineCount] = useState('');
  const [deps, setDeps]                 = useState<BuiltinDeps>(emptyBuiltin());
  // Custom dependency rows
  const [customInt, setCustomInt]       = useState<CustomDep[]>([]);
  const [customExt, setCustomExt]       = useState<CustomDep[]>([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const user        = getSessionUser();
  const isFieldUser = user?.role === 'FIELD_USER';

  useEffect(() => {
    if (isFieldUser && user?.districtId) setDistrictId(user.districtId);
    apiFetch('/api/v1/districts')
      .then(r => r.json())
      .then(d => { if (d.success) setDistricts(d.data); });
  }, []);

  // Auto-calculate offline = total - online
  useEffect(() => {
    const t = parseInt(totalCount), o = parseInt(onlineCount);
    if (!isNaN(t) && !isNaN(o)) {
      const off = t - o;
      if (off >= 0) setOfflineCount(String(off));
    }
  }, [totalCount, onlineCount]);

  // Builtin dep change — stable callback so NumInput doesn't remount
  const handleBuiltinChange = useCallback((key: string, val: string) => {
    setDeps(prev => ({ ...prev, [key]: Math.max(0, parseInt(val) || 0) }));
  }, []);

  // Custom dep value change
  const handleCustomIntChange = useCallback((id: string, val: string) => {
    setCustomInt(prev => prev.map(r => r.id === id ? { ...r, value: Math.max(0, parseInt(val)||0) } : r));
  }, []);
  const handleCustomExtChange = useCallback((id: string, val: string) => {
    setCustomExt(prev => prev.map(r => r.id === id ? { ...r, value: Math.max(0, parseInt(val)||0) } : r));
  }, []);

  function addCustomInt() { setCustomInt(p => [...p, { id: makeCustomId(), label:'', value:0 }]); }
  function addCustomExt() { setCustomExt(p => [...p, { id: makeCustomId(), label:'', value:0 }]); }
  function removeCustomInt(id: string) { setCustomInt(p => p.filter(r => r.id !== id)); }
  function removeCustomExt(id: string) { setCustomExt(p => p.filter(r => r.id !== id)); }
  function setCustomIntLabel(id: string, label: string) {
    setCustomInt(p => p.map(r => r.id === id ? { ...r, label } : r));
  }
  function setCustomExtLabel(id: string, label: string) {
    setCustomExt(p => p.map(r => r.id === id ? { ...r, label } : r));
  }

  const offline = parseInt(offlineCount) || 0;
  const total   = parseInt(totalCount)   || 0;
  const online  = parseInt(onlineCount)  || 0;

  const builtinIntSum = calcInternalSum(deps as any);
  const builtinExtSum = calcExternalSum(deps as any);
  const customIntSum  = customInt.reduce((s,r) => s+r.value, 0);
  const customExtSum  = customExt.reduce((s,r) => s+r.value, 0);
  const intSum        = builtinIntSum + customIntSum;
  const extSum        = builtinExtSum + customExtSum;
  const depSum        = intSum + extSum;

  const countMismatch = total > 0 && online + offline !== total;
  const depMismatch   = offline > 0 && depSum !== offline;
  const canSave = !countMismatch && !depMismatch && total > 0 && offline > 0 && depSum > 0 && depSum === offline && !!districtId;

  async function handleSubmit() {
    if (!canSave) return;
    setError(''); setSaving(true);
    try {
      const customDeps = {
        internal: customInt.filter(r => r.label.trim()).map(r => ({ label: r.label, value: r.value })),
        external: customExt.filter(r => r.label.trim()).map(r => ({ label: r.label, value: r.value })),
      };

      const res  = await apiFetch('/api/v1/entries', {
        method: 'POST',
        body: JSON.stringify({
          districtId, date,
          totalCount: total, onlineCount: online, offlineCount: offline,
          ...deps,
          customDeps, // save custom deps as JSON
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      setSuccess('Entry saved successfully!');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch { setError('Network error. Please try again.'); }
    finally { setSaving(false); }
  }

  function handleClear() {
    setTotalCount(''); setOnlineCount(''); setOfflineCount('');
    setDeps(emptyBuiltin()); setCustomInt([]); setCustomExt([]);
    setError(''); setSuccess('');
    if (!isFieldUser) setDistrictId('');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Daily Data Entry</h2>
        <p className="text-sm text-slate-500 mt-0.5">Enter offline camera dependency data for a district</p>
      </div>

      {/* 1. Basic Info */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">1</span>
          Basic Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">District <span className="text-red-500">*</span></label>
            <select value={districtId} onChange={e=>setDistrictId(e.target.value)}
              disabled={isFieldUser} className="input-field">
              <option value="">Select district...</option>
              {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {districts.length===0 && <p className="text-xs text-amber-600 mt-1">Loading districts...</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date <span className="text-red-500">*</span></label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              max={format(new Date(),'yyyy-MM-dd')} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Count <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={totalCount} onChange={e=>setTotalCount(e.target.value)}
              className="input-field" placeholder="e.g. 2003" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Online Count <span className="text-red-500">*</span></label>
            <input type="number" min="0" value={onlineCount} onChange={e=>setOnlineCount(e.target.value)}
              className="input-field" placeholder="e.g. 1690" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Offline Count</label>
            <input type="number" value={offlineCount} readOnly
              className="input-field bg-slate-50 cursor-not-allowed font-semibold text-red-700" />
            <p className="text-xs text-slate-400 mt-1">= Total − Online</p>
          </div>
        </div>
        {countMismatch && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Online ({online}) + Offline ({offline}) ≠ Total ({total})
          </div>
        )}
      </div>

      {/* 2. Internal Dependencies */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">2</span>
          Internal Dependencies
          <span className="ml-auto text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">Sum: {intSum}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INT_FIELDS.map(f => (
            <div key={f.key}>
              <label htmlFor={f.key} className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
              <NumInput value={deps[f.key]} fieldKey={f.key} onChange={handleBuiltinChange} />
            </div>
          ))}
          {/* Custom internal rows */}
          {customInt.map(row => (
            <div key={row.id} className="col-span-1">
              <div className="flex gap-1 mb-1">
                <input type="text" value={row.label}
                  onChange={e=>setCustomIntLabel(row.id, e.target.value)}
                  placeholder="Custom field name..."
                  className="input-field text-xs flex-1 h-7 py-1" />
                <button onClick={()=>removeCustomInt(row.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input type="number" min="0" inputMode="numeric"
                value={row.value===0?'':row.value} placeholder="0"
                onChange={e=>handleCustomIntChange(row.id, e.target.value)}
                className="input-field text-sm" />
            </div>
          ))}
        </div>
        <button onClick={addCustomInt}
          className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium py-1.5 px-3 rounded-lg hover:bg-amber-50 transition-colors border border-amber-200 border-dashed">
          <Plus className="w-3.5 h-3.5" /> Add Custom Internal Dependency
        </button>
      </div>

      {/* 3. External Dependencies */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">3</span>
          External Dependencies
          <span className="ml-auto text-sm bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-semibold">Sum: {extSum}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXT_FIELDS.map(f => (
            <div key={f.key}>
              <label htmlFor={f.key} className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
              <NumInput value={deps[f.key]} fieldKey={f.key} onChange={handleBuiltinChange} />
            </div>
          ))}
          {customExt.map(row => (
            <div key={row.id} className="col-span-1">
              <div className="flex gap-1 mb-1">
                <input type="text" value={row.label}
                  onChange={e=>setCustomExtLabel(row.id, e.target.value)}
                  placeholder="Custom field name..."
                  className="input-field text-xs flex-1 h-7 py-1" />
                <button onClick={()=>removeCustomExt(row.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input type="number" min="0" inputMode="numeric"
                value={row.value===0?'':row.value} placeholder="0"
                onChange={e=>handleCustomExtChange(row.id, e.target.value)}
                className="input-field text-sm" />
            </div>
          ))}
        </div>
        <button onClick={addCustomExt}
          className="mt-3 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium py-1.5 px-3 rounded-lg hover:bg-teal-50 transition-colors border border-teal-200 border-dashed">
          <Plus className="w-3.5 h-3.5" /> Add Custom External Dependency
        </button>
      </div>

      {/* 4. Validation */}
      <div className={`card p-5 border-2 transition-all ${
        offline>0 && depMismatch ? 'border-red-400 bg-red-50' :
        offline>0 && depSum===offline ? 'border-green-400 bg-green-50' : 'border-slate-200'
      }`}>
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
          {offline>0 && depSum===offline
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : <span className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs">✓</span>
          }
          Validation Check
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg">Internal: {intSum}</span>
          <span className="text-slate-400 font-bold">+</span>
          <span className="bg-teal-100 text-teal-800 px-3 py-1.5 rounded-lg">External: {extSum}</span>
          <span className="text-slate-400 font-bold">=</span>
          <span className={`px-3 py-1.5 rounded-lg font-bold ${depMismatch?'bg-red-200 text-red-800':'bg-blue-100 text-blue-800'}`}>{depSum}</span>
          {offline>0 && (
            <>
              <span className="text-slate-500">vs Offline:</span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-bold">{offline}</span>
              {depMismatch
                ? <span className="flex items-center gap-1 text-red-600 font-bold"><XCircle className="w-4 h-4"/>Mismatch by {Math.abs(depSum-offline)}</span>
                : <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle2 className="w-4 h-4"/>Perfect match!</span>
              }
            </>
          )}
        </div>
        {!districtId && (
          <p className="mt-3 text-sm text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4"/>Select a district above before saving
          </p>
        )}
      </div>

      {error   && <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm"><XCircle className="w-4 h-4 shrink-0"/>{error}</div>}
      {success && <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm"><CheckCircle2 className="w-4 h-4 shrink-0"/>{success}</div>}

      <div className="flex items-center gap-3 pb-6">
        <button onClick={handleSubmit} disabled={!canSave||saving}
          className="btn-primary px-8 py-2.5 flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
          {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:<><Save className="w-4 h-4"/>Save Entry</>}
        </button>
        <button onClick={handleClear} className="btn-secondary px-6 py-2.5 flex items-center gap-2 text-sm">
          <RotateCcw className="w-4 h-4"/>Clear Form
        </button>
        <button onClick={()=>router.push('/dashboard')} className="btn-secondary px-6 py-2.5 flex items-center gap-2 text-sm">
          <X className="w-4 h-4"/>Cancel
        </button>
      </div>
    </div>
  );
}