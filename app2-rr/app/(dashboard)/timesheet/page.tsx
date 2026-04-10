'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import {
  Clock4, Plus, Trash2, Save, Loader2, CheckCircle2,
  AlertTriangle, Info, Shuffle, Sparkles, User, Briefcase
} from 'lucide-react';
import { getSessionUser } from '@/lib/utils/session';

interface Task { id: string; categoryName: string; hours: string; description: string; isCustom: boolean; }
let tid = 0;
const mkTask = (cat = ''): Task => ({ id: `t${++tid}`, categoryName: cat, hours: '', description: '', isCustom: !cat });

function toMinutes(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function calcHours(s: string, e: string): number {
  if (!s || !e) return 0;
  const d = toMinutes(e) - toMinutes(s);
  return d <= 0 ? 0 : Math.round(d / 60 * 10) / 10;
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#5c7875' }}>{label}</label>
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        className="input-field font-mono text-xl font-bold text-center"
        style={{ letterSpacing: '0.05em' }} />
    </div>
  );
}

export default function TimesheetPage() {
  const user = getSessionUser();
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStart]   = useState('09:30');
  const [endTime, setEnd]       = useState('18:30');
  const [tasks, setTasks]       = useState<Task[]>([mkTask()]);
  const [rrCategories, setRrCategories] = useState<{title: string, id: string}[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const [existing, setExisting] = useState<any>(null);

  const totalHours   = calcHours(startTime, endTime);
  const taskHours    = tasks.reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);
  const below8       = totalHours < 8;
  const taskMismatch = Math.abs(taskHours - totalHours) > 0.1 && taskHours > 0;
  const pct          = Math.min((totalHours / 8) * 100, 100);
  const barColor     = totalHours >= 8 ? '#739591' : totalHours >= 6 ? '#eeb295' : '#f43f5e';

  useEffect(() => {
    // Fetch assigned RR Categories
    if (user?.id) {
       apiFetch(`/api/v1/users?id=${user.id}`).then(r => r.json()).then(d => {
         if (d.success && d.data?.rrCategories) {
            setRrCategories(d.data.rrCategories);
         }
       });
    }
  }, [user]);

  useEffect(() => {
    if (!date) return;
    apiFetch(`/api/v1/timesheet?date=${date}`).then(r => r.json()).then(d => {
      if (d.success && d.data?.length > 0) {
        const e = d.data[0];
        setExisting(e); setStart(e.startTime); setEnd(e.endTime);
        setTasks((e.tasks as any[]).map(t => ({ ...mkTask(t.categoryName), hours: String(t.hours), description: t.description })));
      } else { setExisting(null); setTasks([mkTask()]); }
    });
  }, [date]);

  function addTask(cat = '')       { setTasks(p => [...p, mkTask(cat)]); }
  function removeTask(id: string)  { if (tasks.length > 1) setTasks(p => p.filter(t => t.id !== id)); }
  function updateTask(id: string, k: keyof Task, v: string) { setTasks(p => p.map(t => t.id === id ? { ...t, [k]: v } : t)); }

  function distributeHours() {
    if (!totalHours || tasks.length === 0) return;
    const each = Math.round(totalHours / tasks.length * 10) / 10;
    setTasks(p => p.map((t, i) => ({
      ...t, hours: i === p.length - 1
        ? String(Math.round((totalHours - (each * (p.length - 1))) * 10) / 10)
        : String(each),
    })));
  }

  async function handleSave() {
    setError(''); setSaving(true);
    const validTasks = tasks.filter(t => t.categoryName && t.hours && t.description);
    if (!validTasks.length) {
      setError('Add at least one complete task (category + hours + description).');
      setSaving(false); return;
    }
    const res = await apiFetch('/api/v1/timesheet', {
      method: 'POST',
      body: JSON.stringify({ date, startTime, endTime, tasks: validTasks.map(t => ({ categoryName: t.categoryName, hours: parseFloat(t.hours), description: t.description })) }),
    });
    const data = await res.json();
    if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 4000); setExisting(data.data); }
    else setError(data.error || 'Save failed');
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock4 className="w-6 h-6 text-primary-500" />
            {existing ? 'Update Timesheet' : 'Log Daily Progress'}
          </h2>
          <p className="text-sm mt-1 text-primary-600/80">
            {existing ? 'Edit your daily time entry' : 'New entry based on assigned Role Matrix'}
          </p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          max={format(new Date(), 'yyyy-MM-dd')}
          className="input-field w-auto text-sm font-semibold" />
      </div>

      {/* Step 1: Work Hours */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-primary-200/50 pb-4">
          <div className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center text-sm font-bold text-primary-600">1</div>
          <h3 className="section-title">Schedule & Hours</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <TimeInput label="Start Time" value={startTime} onChange={setStart} />
          <TimeInput label="End Time"   value={endTime}   onChange={setEnd}   />
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#5c7875' }}>Total Calculated</label>
            <div className="h-[50px] rounded-2xl flex items-center justify-center font-mono font-bold text-2xl"
              style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${barColor}50`, color: barColor }}>
              {totalHours}h
            </div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="h-4 rounded-full overflow-hidden bg-primary-800/50 border border-primary-200/50 shadow-inner">
            <div className="h-full transition-all duration-700 rounded-full"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}, #94b3ae)` }} />
          </div>
          <div className="flex justify-between items-center mt-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: barColor }}>
              {totalHours >= 8 ? '✓ Optimum schedule' : `⚠ ${(8 - totalHours).toFixed(1)}h short of standard target`}
            </span>
            <span className="text-xs font-mono font-semibold text-primary-200">{pct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Step 2: Task Breakdown based on R&R */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6 border-b border-primary-200/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center text-sm font-bold text-primary-600">2</div>
            <div>
              <h3 className="section-title">Matrix Allocation</h3>
              <p className="text-xs text-primary-500 mt-1 uppercase tracking-widest font-semibold">
                {taskHours}h logged / {totalHours}h schedule
              </p>
            </div>
          </div>
          <button onClick={distributeHours}
            className="btn-secondary py-1.5 px-3 text-xs gap-1">
            <Shuffle className="w-3.5 h-3.5" /> Auto-Distribute Hours
          </button>
        </div>

        {/* Roles Quick Add */}
        <div className="mb-6 p-4 rounded-2xl bg-[#1b2533]/40 border border-white/60 shadow-inner">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 text-primary-300">
            <Briefcase className="w-3.5 h-3.5" /> Direct Report Matrix Objectives
          </p>
          <div className="flex flex-wrap gap-2">
            {rrCategories.length > 0 ? rrCategories.map(c => (
              <button key={c.id} onClick={() => addTask(c.title)}
                className="text-xs px-4 py-2 rounded-xl font-bold transition-all duration-200 bg-[#1b2533] hover:bg-primary-900 text-primary-300 border border-primary-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                + {c.title}
              </button>
            )) : <p className="text-xs text-primary-400 italic">No Roles & Responsibilities assigned yet.</p>}
          </div>
        </div>

        {taskMismatch && (
          <div className="mb-5 p-4 rounded-2xl flex items-center gap-3 text-sm bg-accent-50 text-accent-600 border border-accent-100 shadow-sm">
            <Info className="w-5 h-5 shrink-0" />
            <span className="font-medium">Total logged time ({taskHours}h) doesn't equal scheduled time ({totalHours}h).</span> 
            <span className="opacity-70 text-xs">(Diff: {Math.abs(taskHours - totalHours).toFixed(1)}h)</span>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.map((task, i) => (
            <div key={task.id} className="rounded-2xl p-5 bg-[#1b2533]/30 border border-white/60 shadow-sm transition-all hover:shadow-md hover:bg-[#1b2533]/50 relative group">
                {tasks.length > 1 && (
                  <button onClick={() => removeTask(task.id)}
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#1b2533] shadow-soft flex items-center justify-center text-red-400 border border-red-50 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-primary-600/80">Category / Role</label>
                  <input value={task.categoryName} onChange={e => updateTask(task.id, 'categoryName', e.target.value)}
                    className="input-field text-sm" placeholder="e.g. Server Maintenance" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-primary-600/80">Hours</label>
                  <input type="number" min="0.5" max="24" step="0.5"
                    value={task.hours} onChange={e => updateTask(task.id, 'hours', e.target.value)}
                    className="input-field text-sm font-mono text-center font-bold" placeholder="2.5" />
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-primary-600/80">Documentation</label>
                  <input value={task.description} onChange={e => updateTask(task.id, 'description', e.target.value)}
                    className="input-field text-sm" placeholder="Provide clear updates for the record..." />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => addTask()}
          className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-primary-600 border-2 border-dashed border-primary-200 hover:border-primary-400 hover:bg-primary-900/50 transition-all">
          <Plus className="w-4 h-4" /> Add Extra Category log
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl flex items-start gap-3 text-sm bg-red-50 text-red-600 border border-red-100 shadow-sm animate-fade-up">
          <AlertTriangle className="w-5 h-5 shrink-0" /> <span className="font-semibold">{error}</span>
        </div>
      )}
      {saved && (
        <div className="p-4 rounded-2xl flex items-center gap-3 text-sm bg-primary-800 text-primary-300 border border-primary-200 shadow-glass animate-fade-up">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <strong>Progress mapped to dashboard!</strong> Your matrix timesheet was securely saved.
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 pb-12">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-10 py-3 shadow-glow text-base">
          {saving
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Committing…</>
            : <><Save className="w-5 h-5" /> {existing ? 'Update Log' : 'Commit to Dashboard'}</>
          }
        </button>
      </div>
    </div>
  );
}
