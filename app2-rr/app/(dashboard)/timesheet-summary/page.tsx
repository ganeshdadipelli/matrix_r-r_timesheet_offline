'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import { getSessionUser } from '@/lib/utils/session';
import { 
  Calendar, 
  CheckCircle2, 
  Clock4, 
  FileText, 
  Search, 
  TableProperties, 
  XCircle, 
  Users,
  LayoutGrid,
  TrendingUp,
  AlertCircle,
  Briefcase,
  History as HistoryIcon,
  Download,
} from 'lucide-react';
import ExcelJS from 'exceljs';

type TimesheetEntry = { 
  id: string; 
  startTime: string; 
  endTime: string; 
  totalHours: number; 
  tasks: { categoryName: string, hours: number, description?: string, taskDesc?: string }[]; 
};

type UserSummary = { 
  id: string; 
  name: string; 
  role: string; 
  designation: string | null; 
  parentId: string | null; 
  timesheets: TimesheetEntry[]; 
};

export default function TimesheetSummaryPage() {
  const sessionUser = getSessionUser();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserSummary[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
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

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data, searchQuery]);

  const stats = useMemo(() => {
    const total = data.length;
    const submitted = data.filter(u => u.timesheets?.length > 0).length;
    const avgHours = submitted > 0 
      ? data.reduce((acc, u) => acc + (u.timesheets?.[0]?.totalHours || 0), 0) / submitted 
      : 0;
    return { total, submitted, avgHours };
  }, [data]);

  const myData = filteredData.find(u => u.id === sessionUser?.id);
  const managers = filteredData.filter(u => u.role === 'MANAGER');
  
  const mappedGroups = managers.map(mgr => ({
    manager: mgr,
    members: filteredData.filter(u => u.parentId === mgr.id)
  }));

  const directMembers = filteredData.filter(u => u.role === 'TEAM_MEMBER' && u.parentId === sessionUser?.id);

  function TimeCard({ user }: { user: UserSummary }) {
    const ts = user.timesheets?.[0];
    
    if (!ts) {
      return (
        <div className="group flex bg-[#0c121d] p-5 rounded-3xl border border-red-500/10 hover:border-red-500/20 transition-all">
           <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
               <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                 <XCircle className="h-5 w-5" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-200 leading-tight">{user.name}</h4>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{user.designation || user.role}</p>
               </div>
             </div>
             <div className="mt-3 py-2 px-3 rounded-xl bg-red-500/5 inline-flex items-center gap-2 border border-red-500/10">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-400/80">Missing Report</span>
             </div>
           </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col bg-[#0c121d] p-0 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
         <div className="p-6 bg-gradient-to-br from-[#151c27] to-[#0c121d] border-b border-white/5">
           <div className="flex justify-between items-start">
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-[1.2rem] bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
                 <Users className="h-6 w-6" />
               </div>
               <div>
                 <h4 className="font-black text-white text-lg tracking-tight">{user.name}</h4>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">{user.designation || user.role}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Daily Report</span>
                 </div>
               </div>
             </div>
             <div className="text-right">
                <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="text-[10px] font-bold block uppercase tracking-tighter opacity-70">Logged Hours</span>
                  <span className="text-lg font-black">{ts.totalHours.toFixed(1)}</span>
                </div>
             </div>
           </div>
           
           <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/5">
             <div className="flex items-center gap-2">
               <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400"><Clock4 className="h-3.5 w-3.5" /></div>
               <div>
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Timeline</p>
                 <p className="text-xs font-bold text-slate-200">{ts.startTime} - {ts.endTime}</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400"><LayoutGrid className="h-3.5 w-3.5" /></div>
               <div>
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Deliverables</p>
                 <p className="text-xs font-bold text-slate-200">{ts.tasks?.length || 0} Task Areas</p>
               </div>
             </div>
           </div>
         </div>

         <div className="p-6 space-y-3 bg-[#080d16]/30">
            {ts.tasks.map((task: any, idx: number) => (
              <div key={idx} className="bg-[#111823]/50 border border-white/5 rounded-2xl p-4 transition hover:bg-[#151c27] hover:border-white/10 shadow-sm relative overflow-hidden group/task">
                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 group-hover/task:bg-indigo-500 transition-colors" />
                 <div className="flex justify-between items-start gap-4 mb-2">
                   <h5 className="text-sm font-black text-slate-100 uppercase tracking-tight">{task.categoryName || 'General Workflow'}</h5>
                   {task.hours > 0 && <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/10">{task.hours}h</span>}
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium">
                   {task.description || task.taskDesc || 'No detailed log provided for this scope.'}
                 </p>
              </div>
            ))}
            {(!ts.tasks || ts.tasks.length === 0) && (
              <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                <FileText className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Minimal Task Log</p>
              </div>
            )}
         </div>
      </div>
    );
  }

  async function exportToExcel() {
    if (!filteredData.length) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Execution Report - ${date}`);

    // Define Columns
    worksheet.columns = [
      { header: 'Tactical Identity', key: 'name', width: 25 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Daily Start', key: 'start', width: 12 },
      { header: 'Daily End', key: 'end', width: 12 },
      { header: 'Total Hours', key: 'total', width: 12 },
      { header: 'Task Domain', key: 'category', width: 25 },
      { header: 'Operational Description', key: 'desc', width: 50 },
      { header: 'Allocated Hours', key: 'taskHours', width: 15 },
    ];

    // Style Header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Indigo-600
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Process Data
    filteredData.forEach((user) => {
      const ts = user.timesheets?.[0];
      if (!ts) {
        worksheet.addRow({
          name: user.name,
          designation: user.designation || user.role,
          start: 'MISSING',
          end: 'MISSING',
          total: 0,
          category: 'NO REPORT FILED',
          desc: '---',
          taskHours: 0
        }).font = { color: { argb: 'FFF87171' } }; // Red-400
        return;
      }

      ts.tasks.forEach((task: any, idx: number) => {
        worksheet.addRow({
          name: idx === 0 ? user.name : '',
          designation: idx === 0 ? (user.designation || user.role) : '',
          start: idx === 0 ? ts.startTime : '',
          end: idx === 0 ? ts.endTime : '',
          total: idx === 0 ? ts.totalHours : '',
          category: task.categoryName || 'General',
          desc: task.description || task.taskDesc || '',
          taskHours: task.hours
        });
      });

      // Add empty row separator
      worksheet.addRow({});
    });

    // Auto-filter and freeze header
    worksheet.autoFilter = 'A1:H1';
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Buffer and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Matrix_Execution_Report_${date}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-20">
      {/* Header & Filter Section */}
      <section className="bg-[#0c121d] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[100px] -ml-32 -mb-32 rounded-full" />
        
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4">
               <div className="h-14 w-14 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)]">
                 <TableProperties className="h-7 w-7" />
               </div>
               <div>
                  <h1 className="text-3xl font-black text-white tracking-tight leading-none uppercase">Execution Reports</h1>
                  <p className="mt-2 text-sm text-slate-400 font-medium tracking-tight">Monitoring and analyzing daily work delivery across structural hierarchy.</p>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <button
               onClick={exportToExcel}
               disabled={!filteredData.length || loading}
               className="flex items-center justify-center gap-3 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-xl shadow-indigo-500/20"
            >
               <Download className="h-4 w-4" /> Export Report
            </button>

            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reporting Date</label>
              <div className="group relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition" />
                <input 
                  type="date" 
                  value={date} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setDate(e.target.value)} 
                  className="w-full bg-[#151c27] border border-white/5 text-white pl-11 pr-4 py-3.5 rounded-2xl focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition outline-none cursor-pointer font-bold text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[280px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Filter Members</label>
              <div className="group relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition" />
                <input 
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#151c27] border border-white/5 text-white pl-11 pr-4 py-3.5 rounded-2xl focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition outline-none font-bold text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dash Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 relative">
          {[
            { label: 'Total Strength', val: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Reports Logged', val: stats.submitted, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Active Compliance', val: stats.total > 0 ? `${Math.round((stats.submitted/stats.total)*100)}%` : '0%', icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Avg Prod. Hours', val: stats.avgHours.toFixed(1), icon: Clock4, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 p-5 rounded-[1.8rem] hover:bg-white/[0.04] transition group">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="text-2xl font-black text-white mt-1 tracking-tighter">{stat.val}</p>
            </div>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-[0.8rem] border-4 border-indigo-500 border-t-transparent shadow-xl shadow-indigo-500/20" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 p-10 rounded-[2rem] text-red-500 font-black text-center shadow-xl">
          <AlertCircle className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p className="text-xl tracking-tight">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-12 mt-8">
          
          {/* DC Head / Self Section */}
          {myData && (
            <section className="animate-in fade-in duration-1000">
               <div className="flex items-center gap-4 mb-6">
                 <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                   <Briefcase className="h-4 w-4" />
                 </div>
                 <h2 className="text-xl font-black text-white tracking-tight uppercase">Your Delivery Profile</h2>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <TimeCard user={myData} />
               </div>
            </section>
          )}

          {/* Managers & Their Teams (Workspace View) */}
          {mappedGroups.map((group, gi) => (
            <section key={group.manager.id} className={`space-y-8 animate-in fade-in duration-1000`} style={{ animationDelay: `${gi * 150}ms` }}>
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <LayoutGrid className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-indigo-100 tracking-tight">Manager: {group.manager.name}</h2>
                 </div>
                 <span className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Scope: {group.members.length} Reports
                 </span>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 xl:col-span-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-2">Manager Oversight</p>
                    <TimeCard user={group.manager} />
                 </div>
                 
                 <div className="lg:col-span-2 xl:col-span-2 bg-[#080d16]/20 p-8 rounded-[2.5rem] border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 px-2">Operational Execution Log</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {group.members.map(member => <TimeCard key={member.id} user={member} />)}
                      {group.members.length === 0 && (
                        <div className="md:col-span-2 py-16 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                           <Users className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                           <p className="text-sm font-black text-slate-600 uppercase tracking-widest">No assigned team members</p>
                        </div>
                      )}
                    </div>
                 </div>
               </div>
            </section>
          ))}

          {/* Direct Members Side Section */}
          {directMembers.length > 0 && (
            <section className="pt-8 animate-in fade-in duration-1000">
               <div className="flex items-center gap-4 mb-8">
                 <div className="h-10 w-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                   <Users className="h-5 w-5" />
                 </div>
                 <h2 className="text-2xl font-black text-white tracking-tight">Direct Execution Control</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 p-10 bg-blue-500/[0.02] border border-blue-500/10 rounded-[3rem]">
                 {directMembers.map(member => <TimeCard key={member.id} user={member} />)}
               </div>
            </section>
          )}

          {mappedGroups.length === 0 && directMembers.length === 0 && (!myData) && !loading && (
            <div className="text-center py-32 bg-[#0c121d] border border-dashed border-[#2d3a4d] rounded-[3rem] shadow-2xl">
              <Search className="h-16 w-16 text-slate-800 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-slate-300 tracking-tight">Scope Boundary Exhausted</h3>
              <p className="text-slate-500 mt-2 font-medium">No results match your search or current scope. Try a different date.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

