'use client';
// app/(dashboard)/entry/history/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { canEditEntry, getTimeRemaining } from '@/lib/utils/editLock';
import { History, Plus, RefreshCw, Lock, Clock, CheckCircle } from 'lucide-react';

interface Entry {
  id: string; date: string; isLocked: boolean; createdAt: string;
  offlineCount: number; onlinePct: number; offlinePct: number;
  districtId: string;
  district: { name: string; code: string };
  createdBy: { name: string };
}

export default function EntryHistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getSessionUser();

  useEffect(() => {
    apiFetch('/api/v1/entries')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const filtered = user?.role === 'FIELD_USER'
            ? d.data.filter((x: Entry) => x.districtId === user.districtId)
            : d.data;
          setEntries(filtered);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(95,111,125,0.2)', border:'1px solid rgba(95,111,125,0.3)' }}>
            <History className="w-5 h-5 text-matrix-slate" />
          </div>
          <div>
            <h2 className="section-title">Entry History</h2>
            <p className="section-subtitle">All past submissions · Editable within 12 hours</p>
          </div>
        </div>
        <button onClick={() => router.push('/entry')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Date','District','Offline','Offline %','Submitted By','Lock Status','Action'].map(h=>(
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-14 text-matrix-cloud/30">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-matrix-slate/40" />
                  Loading history…
                </td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14 text-matrix-cloud/30">No entries found.</td></tr>
              ) : entries.slice(0, 200).map(e => {
                const editable = user ? canEditEntry(e.createdAt, e.isLocked, user.role) : false;
                const timeLeft = editable ? getTimeRemaining(e.createdAt) : '';
                const pctColor = e.offlinePct < 10
                  ? { bg:'rgba(16,185,129,0.12)', text:'#6EE7B7', border:'rgba(16,185,129,0.25)' }
                  : e.offlinePct < 15
                  ? { bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.25)' }
                  : { bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.25)' };
                return (
                  <tr key={e.id} className="table-tr-hover">
                    <td className="table-td font-sans text-matrix-cream">{format(new Date(e.date),'dd MMM yyyy')}</td>
                    <td className="table-td font-sans font-semibold text-matrix-cream">{e.district.name}</td>
                    <td className="table-td font-mono font-bold text-red-400">{e.offlineCount}</td>
                    <td className="table-td">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
                        style={{ background:pctColor.bg, color:pctColor.text, borderColor:pctColor.border }}>
                        {e.offlinePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-td font-sans text-xs text-matrix-cloud/50">{e.createdBy?.name}</td>
                    <td className="table-td text-xs">
                      {e.isLocked ? (
                        <span className="inline-flex items-center gap-1 badge-gray"><Lock className="w-3 h-3" /> Locked</span>
                      ) : editable ? (
                        <span className="inline-flex items-center gap-1 badge-green"><Clock className="w-3 h-3" /> {timeLeft}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 badge-red"><CheckCircle className="w-3 h-3" /> Expired</span>
                      )}
                    </td>
                    <td className="table-td">
                      {editable ? (
                        <button onClick={() => router.push(`/entry/${e.id}/edit`)}
                          className="text-xs font-semibold text-matrix-slate hover:text-matrix-cloud transition-colors">
                          Edit
                        </button>
                      ) : (
                        <span className="text-matrix-border text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
