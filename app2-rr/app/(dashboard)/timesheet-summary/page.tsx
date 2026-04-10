'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { Calendar, CheckCircle2, Clock4, FileText, Search, TableProperties, XCircle, Users } from 'lucide-react';

type TimesheetEntry = { id: string; startTime: string; endTime: string; totalHours: number; tasks: { taskDesc: string, categoryId: string }[]; };
type UserSummary = { id: string; name: string; role: string; designation: string | null; parentId: string | null; timesheets: TimesheetEntry[]; };

export default function TimesheetSummaryPage() {
  const sessionUser = getSessionUser();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const d = new Date(date);
        const res = await apiFetch(`/api/v1/timesheet/summary?date=${d.toISOString()}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setData(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load timesheets');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date]);

  // Group data logically for the view
  const myData = data.find(u => u.id === sessionUser?.id);
  const managers = data.filter(u => u.role === 'MANAGER');
  
  // Create hierarchy grouping
  const mappedGroups = managers.map(mgr => {
    return {
      manager: mgr,
      members: data.filter(u => u.parentId === mgr.id)
    };
  });

  // Include direct members of Super Boss
  const directMembers = data.filter(u => u.role === 'TEAM_MEMBER' && u.parentId === sessionUser?.id);

  function TimeCard({ user }: { user: UserSummary }) {
    const ts = user.timesheets?.[0];
    
    if (!ts) {
      return (
        <div className="flex bg-[#111823] p-4 rounded-2xl border border-red-900/30">
           <div className="flex-1">
             <div className="flex items-center gap-2 mb-1">
               <h4 className="font-bold text-slate-200">{user.name}</h4>
               <span className="text-[10px] font-mono text-slate-500 uppercase">{user.designation || user.role}</span>
             </div>
             <p className="text-sm text-red-400 flex items-center gap-1.5 font-medium"><XCircle className="h-4 w-4" /> Not logged for this date</p>
           </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col bg-[#151c27] p-5 rounded-2xl border border-[#2d3a4d] shadow-sm">
         <div className="flex justify-between items-start mb-4">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <h4 className="font-bold text-white text-lg">{user.name}</h4>
               <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">{user.designation || user.role}</span>
             </div>
             <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mt-2">
               <span className="flex items-center gap-1"><Clock4 className="h-3.5 w-3.5 text-emerald-400" /> {ts.startTime} - {ts.endTime}</span>
               <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> {ts.totalHours.toFixed(1)} Hours Total</span>
             </div>
           </div>
         </div>

         <div className="space-y-2 mt-2">
             <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Tasks Executed</p>
             {ts.tasks.map((task: any, idx: number) => (
               <div key={idx} className="bg-[#1b2533] border border-[#2d3a4d] rounded-xl p-3 flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-200">{task.categoryName || 'Task'}</span>
                      {task.hours && <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">{task.hours}h</span>}
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{task.description || task.taskDesc || '—'}</p>
                  </div>
               </div>
             ))}
             {ts.tasks.length === 0 && <p className="text-sm text-slate-500 italic">No task descriptions detailed.</p>}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#151c27] p-8 rounded-3xl border border-[#2d3a4d] shadow-xl">
        <div>
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500/20 p-2.5 rounded-2xl border border-indigo-500/30">
               <TableProperties className="h-6 w-6 text-indigo-400" />
             </div>
             <h1 className="text-2xl font-black text-white">Execution Summary</h1>
          </div>
          <p className="mt-2 text-sm text-slate-400">Review timesheets, tracking, and daily execution across all workflows.</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
             <Calendar className="h-4 w-4" /> Select Execution Date
          </label>
          <input 
            type="date" 
            value={date} 
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setDate(e.target.value)} 
            className="bg-[#0b111a] border border-[#2d3a4d] text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition outline-none cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="card p-8 border-red-900/50 text-red-500 font-bold text-center">{error}</div>
      ) : (
        <div className="space-y-8">
          
          {/* DC Head / Self Section */}
          {myData && (
            <section>
               <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-[#2d3a4d] pb-2">
                 <span className="bg-emerald-500/10 text-emerald-400 p-1 rounded-md"><FileText className="h-4 w-4" /></span> 
                 Your Execution
               </h2>
               <div className="pl-0"><TimeCard user={myData} /></div>
            </section>
          )}

          {/* Direct Members */}
          {directMembers.length > 0 && (
            <section>
               <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-[#2d3a4d] pb-2">
                 <span className="bg-blue-500/10 text-blue-400 p-1 rounded-md"><Users className="h-4 w-4" /></span> 
                 Direct Reports
               </h2>
               <div className="space-y-4">
                 {directMembers.map(member => <TimeCard key={member.id} user={member} />)}
               </div>
            </section>
          )}

          {/* Managers & Their Teams */}
          {mappedGroups.map((group) => (
            <section key={group.manager.id} className="bg-[#0b111a] border border-[#2d3a4d]/50 p-6 rounded-3xl">
               <h2 className="text-xl font-black text-indigo-100 mb-6 flex items-center gap-2">
                 Manager Workspace: {group.manager.name}
               </h2>
               <div className="space-y-6">
                 <div>
                   <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-2">Manager Timesheet</p>
                   <TimeCard user={group.manager} />
                 </div>
                 
                 <div className="pl-6 border-l-2 border-[#1b2533]">
                   <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-2">Team Execution ({group.members.length})</p>
                   <div className="space-y-4">
                     {group.members.map(member => <TimeCard key={member.id} user={member} />)}
                     {group.members.length === 0 && <p className="text-sm text-slate-500 italic p-3">No team members mapped.</p>}
                   </div>
                 </div>
               </div>
            </section>
          ))}

          {mappedGroups.length === 0 && directMembers.length === 0 && (!myData) && (
            <div className="text-center p-12 text-slate-400 border border-dashed border-[#2d3a4d] rounded-3xl">
              No structural timesheet data accessible for this scope.
            </div>
          )}

        </div>
      )}
    </div>
  );
}
