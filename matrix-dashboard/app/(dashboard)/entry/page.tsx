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
  AlertTriangle, Loader2, Plus, Trash2, ClipboardEdit,
} from 'lucide-react';

// NumInput MUST be outside parent to prevent remount-on-render (focus loss).
interface NumInputProps { value: number; fieldKey: string; onChange: (key: string, val: string) => void; }
function NumInput({ value, fieldKey, onChange }: NumInputProps) {
  return (
    <input type="number" min="0" inputMode="numeric" id={fieldKey}
      value={value === 0 ? '' : value} placeholder="0"
      onChange={e => onChange(fieldKey, e.target.value)}
      className="input-field text-sm" />
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

interface CustomDep { id: string; label: string; value: number; }
let customIdCounter = 0;
function makeCustomId() { return `custom_${++customIdCounter}_${Date.now()}`; }

function SectionHeader({ step, label, stepColor, sum, sumColor }: {
  step: string; label: string; stepColor: string; sum?: number; sumColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: stepColor }}>
        {step}
      </div>
      <h3 className="font-semibold text-matrix-cream font-display">{label}</h3>
      {sum !== undefined && (
        <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: `${sumColor}20`, color: sumColor, border: `1px solid ${sumColor}30` }}>
          Sum: {sum}
        </span>
      )}
    </div>
  );
}

export default function EntryPage() {
  const router = useRouter();
  const [districts, setDistricts]       = useState<District[]>([]);
  const [districtId, setDistrictId]     = useState('');
  const [date, setDate]                 = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalCount, setTotalCount]     = useState('');
  const [onlineCount, setOnlineCount]   = useState('');
  const [offlineCount, setOfflineCount] = useState('');
  const [deps, setDeps]                 = useState<BuiltinDeps>(emptyBuiltin());
  const [customInt, setCustomInt]       = useState<CustomDep[]>([]);
  const [customExt, setCustomExt]       = useState<CustomDep[]>([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const user        = getSessionUser();
  const isFieldUser = user?.role === 'FIELD_USER';
  const assignedIds = isFieldUser ? (user?.districtIds || (user?.districtId ? [user.districtId] : [])) : null;

  useEffect(() => {
    apiFetch('/api/v1/districts').then(r=>r.json()).then(d=>{
      if (!d.success) return;
      const all: District[] = d.data;
      const filtered = assignedIds ? all.filter(x => assignedIds.includes(x.id)) : all;
      setDistricts(filtered);
      // Auto-select if only one district is assigned
      if (isFieldUser && filtered.length === 1) setDistrictId(filtered[0].id);
    });
  }, []);

  useEffect(() => {
    const t = parseInt(totalCount), o = parseInt(onlineCount);
    if (!isNaN(t) && !isNaN(o) && t - o >= 0) setOfflineCount(String(t - o));
  }, [totalCount, onlineCount]);

  const handleBuiltinChange  = useCallback((key: string, val: string) => {
    setDeps(prev => ({ ...prev, [key]: Math.max(0, parseInt(val)||0) }));
  }, []);
  const handleCustomIntChange = useCallback((id: string, val: string) => {
    setCustomInt(prev => prev.map(r => r.id===id ? { ...r, value: Math.max(0,parseInt(val)||0) } : r));
  }, []);
  const handleCustomExtChange = useCallback((id: string, val: string) => {
    setCustomExt(prev => prev.map(r => r.id===id ? { ...r, value: Math.max(0,parseInt(val)||0) } : r));
  }, []);

  function addCustomInt() { setCustomInt(p=>[...p,{ id:makeCustomId(), label:'', value:0 }]); }
  function addCustomExt() { setCustomExt(p=>[...p,{ id:makeCustomId(), label:'', value:0 }]); }
  function removeCustomInt(id: string) { setCustomInt(p=>p.filter(r=>r.id!==id)); }
  function removeCustomExt(id: string) { setCustomExt(p=>p.filter(r=>r.id!==id)); }
  function setCustomIntLabel(id: string, label: string) { setCustomInt(p=>p.map(r=>r.id===id?{...r,label}:r)); }
  function setCustomExtLabel(id: string, label: string) { setCustomExt(p=>p.map(r=>r.id===id?{...r,label}:r)); }

  const offline = parseInt(offlineCount)||0;
  const total   = parseInt(totalCount)||0;
  const online  = parseInt(onlineCount)||0;
  const intSum  = calcInternalSum(deps as any) + customInt.reduce((s,r)=>s+r.value,0);
  const extSum  = calcExternalSum(deps as any) + customExt.reduce((s,r)=>s+r.value,0);
  const depSum  = intSum + extSum;

  const countMismatch = total>0 && online+offline!==total;
  const depMismatch   = offline>0 && depSum!==offline;
  const canSave = !countMismatch && !depMismatch && total>0 && offline>0 && depSum>0 && depSum===offline && !!districtId;

  async function handleSubmit() {
    if (!canSave) return;
    setError(''); setSaving(true);
    try {
      const customDeps = {
        internal: customInt.filter(r=>r.label.trim()).map(r=>({ label:r.label, value:r.value })),
        external: customExt.filter(r=>r.label.trim()).map(r=>({ label:r.label, value:r.value })),
      };
      const res  = await apiFetch('/api/v1/entries', {
        method:'POST',
        body: JSON.stringify({ districtId, date, totalCount:total, onlineCount:online, offlineCount:offline, ...deps, customDeps }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error||'Failed to save'); return; }
      setSuccess('Entry saved successfully!');
      setTimeout(()=>router.push('/dashboard'), 1500);
    } catch { setError('Network error. Please try again.'); }
    finally { setSaving(false); }
  }

  function handleClear() {
    setTotalCount(''); setOnlineCount(''); setOfflineCount('');
    setDeps(emptyBuiltin()); setCustomInt([]); setCustomExt([]);
    setError(''); setSuccess('');
    if (!isFieldUser) setDistrictId('');
  }

  const fieldLabelClass = "block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5";

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background:'rgba(214,163,138,0.15)', border:'1px solid rgba(214,163,138,0.25)' }}>
          <ClipboardEdit className="w-5 h-5 text-matrix-peach" />
        </div>
        <div>
          <h2 className="section-title">Daily Data Entry</h2>
          <p className="section-subtitle">Enter offline camera dependency data for a district</p>
        </div>
      </div>

      {/* ── 1. Basic Info ── */}
      <div className="card p-5 animate-fade-in-up" style={{ animationDelay:'0ms', animationFillMode:'both' }}>
        <SectionHeader step="1" label="Basic Information" stepColor="#D6A38A" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabelClass}>District <span className="text-red-400">*</span></label>
            <select value={districtId} onChange={e=>setDistrictId(e.target.value)} disabled={isFieldUser && districts.length <= 1} className="input-field">
              <option value="">Select district…</option>
              {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {districts.length===0 && <p className="text-xs text-amber-400/60 mt-1">Loading districts…</p>}
          </div>
          <div>
            <label className={fieldLabelClass}>Date <span className="text-red-400">*</span></label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              max={format(new Date(),'yyyy-MM-dd')} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className={fieldLabelClass}>Total Count <span className="text-red-400">*</span></label>
            <input type="number" min="0" value={totalCount} onChange={e=>setTotalCount(e.target.value)}
              className="input-field" placeholder="e.g. 2003" />
          </div>
          <div>
            <label className={fieldLabelClass}>Online Count <span className="text-red-400">*</span></label>
            <input type="number" min="0" value={onlineCount} onChange={e=>setOnlineCount(e.target.value)}
              className="input-field" placeholder="e.g. 1690" />
          </div>
          <div>
            <label className={fieldLabelClass}>Offline Count</label>
            <input type="number" value={offlineCount} readOnly
              className="input-field cursor-not-allowed font-bold text-red-400"
              style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }} />
            <p className="text-[10px] text-matrix-cloud/30 mt-1">= Total − Online</p>
          </div>
        </div>
        {countMismatch && (
          <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in"
            style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-red-300">Online ({online}) + Offline ({offline}) ≠ Total ({total})</span>
          </div>
        )}
      </div>

      {/* ── 2. Internal Dependencies ── */}
      <div className="card p-5 animate-fade-in-up" style={{ animationDelay:'80ms', animationFillMode:'both' }}>
        <SectionHeader step="2" label="Internal Dependencies" stepColor="#D6A38A" sum={intSum} sumColor="#D6A38A" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INT_FIELDS.map(f => (
            <div key={f.key}>
              <label htmlFor={f.key} className={fieldLabelClass}>{f.label}</label>
              <NumInput value={deps[f.key]} fieldKey={f.key} onChange={handleBuiltinChange} />
            </div>
          ))}
          {customInt.map(row => (
            <div key={row.id}>
              <div className="flex gap-1 mb-1">
                <input type="text" value={row.label} onChange={e=>setCustomIntLabel(row.id,e.target.value)}
                  placeholder="Custom field name…" className="input-field text-xs flex-1 py-1 h-7" />
                <button onClick={()=>removeCustomInt(row.id)}
                  className="p-1 text-red-400/50 hover:text-red-400 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input type="number" min="0" inputMode="numeric"
                value={row.value===0?'':row.value} placeholder="0"
                onChange={e=>handleCustomIntChange(row.id,e.target.value)}
                className="input-field text-sm" />
            </div>
          ))}
        </div>
        <button onClick={addCustomInt}
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all"
          style={{ color:'#D6A38A', border:'1px dashed rgba(214,163,138,0.3)', background:'rgba(214,163,138,0.05)' }}>
          <Plus className="w-3.5 h-3.5" /> Add Custom Internal Dependency
        </button>
      </div>

      {/* ── 3. External Dependencies ── */}
      <div className="card p-5 animate-fade-in-up" style={{ animationDelay:'160ms', animationFillMode:'both' }}>
        <SectionHeader step="3" label="External Dependencies" stepColor="#5F6F7D" sum={extSum} sumColor="#7C8A96" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXT_FIELDS.map(f => (
            <div key={f.key}>
              <label htmlFor={f.key} className={fieldLabelClass}>{f.label}</label>
              <NumInput value={deps[f.key]} fieldKey={f.key} onChange={handleBuiltinChange} />
            </div>
          ))}
          {customExt.map(row => (
            <div key={row.id}>
              <div className="flex gap-1 mb-1">
                <input type="text" value={row.label} onChange={e=>setCustomExtLabel(row.id,e.target.value)}
                  placeholder="Custom field name…" className="input-field text-xs flex-1 py-1 h-7" />
                <button onClick={()=>removeCustomExt(row.id)}
                  className="p-1 text-red-400/50 hover:text-red-400 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input type="number" min="0" inputMode="numeric"
                value={row.value===0?'':row.value} placeholder="0"
                onChange={e=>handleCustomExtChange(row.id,e.target.value)}
                className="input-field text-sm" />
            </div>
          ))}
        </div>
        <button onClick={addCustomExt}
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all"
          style={{ color:'#7C8A96', border:'1px dashed rgba(95,111,125,0.3)', background:'rgba(95,111,125,0.05)' }}>
          <Plus className="w-3.5 h-3.5" /> Add Custom External Dependency
        </button>
      </div>

      {/* ── 4. Validation ── */}
      <div className="card p-5 animate-fade-in-up" style={{ animationDelay:'240ms', animationFillMode:'both',
        borderColor: offline>0&&depMismatch ? 'rgba(239,68,68,0.4)' : offline>0&&depSum===offline ? 'rgba(16,185,129,0.4)' : undefined,
        background: offline>0&&depMismatch ? 'rgba(239,68,68,0.05)' : offline>0&&depSum===offline ? 'rgba(16,185,129,0.05)' : undefined,
      }}>
        <div className="flex items-center gap-3 mb-4">
          {offline>0 && depSum===offline
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background:'#2E3D44' }}>✓</div>
          }
          <h3 className="font-semibold text-matrix-cream font-display">Validation Check</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {[
            { label:`Internal: ${intSum}`, color:'#D6A38A' },
            { label:'+', plain:true },
            { label:`External: ${extSum}`, color:'#7C8A96' },
            { label:'=', plain:true },
            { label:`Total: ${depSum}`, color: depMismatch ? '#EF4444' : '#A3ADB5' },
          ].map((item,i) => item.plain
            ? <span key={i} className="text-matrix-cloud/30 font-bold">{item.label}</span>
            : <span key={i} className="px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ background:`${item.color}15`, color:item.color, border:`1px solid ${item.color}25` }}>
                {item.label}
              </span>
          )}
          {offline>0 && (<>
            <span className="text-matrix-cloud/30">vs Offline:</span>
            <span className="px-3 py-1.5 rounded-lg font-bold"
              style={{ background:'rgba(255,255,255,0.04)', color:'#EDEAE6', border:'1px solid rgba(255,255,255,0.08)' }}>
              {offline}
            </span>
            {depMismatch
              ? <span className="flex items-center gap-1 text-red-400 font-bold">
                  <XCircle className="w-4 h-4"/> Mismatch by {Math.abs(depSum-offline)}
                </span>
              : <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4"/> Perfect match!
                </span>
            }
          </>)}
        </div>
        {!districtId && (
          <p className="mt-3 text-sm text-amber-400/70 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4"/> Select a district above before saving
          </p>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg flex items-center gap-2 text-sm animate-fade-in"
          style={{ background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <XCircle className="w-4 h-4 text-red-400 shrink-0"/><span className="text-red-300">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg flex items-center gap-2 text-sm animate-fade-in"
          style={{ background:'rgba(16,185,129,0.09)', border:'1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/><span className="text-emerald-300">{success}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button onClick={handleSubmit} disabled={!canSave||saving}
          className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-40">
          {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:<><Save className="w-4 h-4"/>Save Entry</>}
        </button>
        <button onClick={handleClear} className="btn-secondary px-6 py-2.5 flex items-center gap-2">
          <RotateCcw className="w-4 h-4"/> Clear Form
        </button>
        <button onClick={()=>router.push('/dashboard')} className="btn-ghost px-6 py-2.5 flex items-center gap-2">
          <X className="w-4 h-4"/> Cancel
        </button>
      </div>
    </div>
  );
}
