'use client';
// app/(dashboard)/entry/history/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { canEditEntry, getTimeRemaining } from '@/lib/utils/editLock';

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Entry History</h2>
          <p className="text-sm text-slate-500 mt-0.5">All past submissions — editable within 12 hours</p>
        </div>
        <button onClick={() => router.push('/entry')} className="btn-primary flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          New Entry
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Date','District','Offline','Offline %','Submitted By','Lock Status','Action'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Loading history...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No entries found.</td></tr>
              ) : entries.slice(0, 200).map(e => {
                const editable = user ? canEditEntry(e.createdAt, e.isLocked, user.role) : false;
                const timeLeft = editable ? getTimeRemaining(e.createdAt) : '';
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="table-td font-sans">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                    <td className="table-td font-sans font-medium text-primary-700">{e.district.name}</td>
                    <td className="table-td text-red-600 font-semibold">{e.offlineCount}</td>
                    <td className="table-td">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.offlinePct < 10 ? 'bg-green-100 text-green-800' :
                        e.offlinePct < 15 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>{e.offlinePct.toFixed(1)}%</span>
                    </td>
                    <td className="table-td font-sans text-xs">{e.createdBy?.name}</td>
                    <td className="table-td text-xs">
                      {e.isLocked ? (
                        <span className="badge-gray">🔒 Locked</span>
                      ) : editable ? (
                        <span className="badge-green">🟢 {timeLeft}</span>
                      ) : (
                        <span className="badge-red">⏰ Expired</span>
                      )}
                    </td>
                    <td className="table-td">
                      {editable ? (
                        <button onClick={() => router.push(`/entry/${e.id}/edit`)}
                          className="text-primary-600 hover:underline text-xs font-medium">
                          Edit
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
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
