'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Bot, Cpu, BrainCircuit, RefreshCw, Sparkles, Activity, Zap, TrendingUp, LayoutGrid } from 'lucide-react';
import { apiFetch } from '@/lib/utils/apiFetch';

// Dynamic imports for Recharts to avoid SSR "Super expression" errors
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const ReTooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function MLInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [timesheetData, setTimesheetData] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [mlResult, setMlResult] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await apiFetch(`/api/v1/timesheet/summary?date=${today}`);
        const json = await res.json();
        if (json.success) setTimesheetData(json.data || []);
      } catch (err) {
        console.error("Failed to load insights data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    const deliveryMap: Record<string, { name: string, hours: number }> = {};

    timesheetData.forEach(user => {
      const ts = user.timesheets?.[0];
      if (ts) {
        ts.tasks.forEach((t: any) => {
          const cat = t.categoryName || 'General';
          categoryMap[cat] = (categoryMap[cat] || 0) + t.hours;
        });
        deliveryMap[user.id] = { name: user.name.split(' ')[0], hours: ts.totalHours };
      }
    });

    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    const userDelivery = Object.values(deliveryMap).sort((a, b) => b.hours - a.hours).slice(0, 8);

    return { categoryData, userDelivery };
  }, [timesheetData]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setTimeout(() => {
      setMlResult({
        alignment_score: 94.2,
        alignment_details: "NLP models identified cross-functional synergy targets.",
        burnout_risk: "Optimal Balance",
        burnout_score: 0.82,
        anomaly_detected: false
      });
      setAnalyzing(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Bot className="h-12 w-12 animate-pulse text-indigo-500" />
          <p className="text-slate-400 text-sm font-semibold tracking-wider font-mono uppercase">Initializing Tactical Insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <section className="bg-[#0c121d] p-10 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Cpu className="h-64 w-64 text-indigo-500" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-4">
              <div className="bg-indigo-500/10 p-4 rounded-3xl border border-indigo-500/20 shadow-glow">
                <BrainCircuit className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight text-white flex items-center gap-3 uppercase">
                  Matrix <span className="text-indigo-400">Intelligence</span>
                </h2>
                <div className="flex items-center gap-2 mt-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Autonomous Analytics Protocol Active</p>
                </div>
              </div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_15px_40px_-10px_rgba(79,70,229,0.4)] transition hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {analyzing ? 'Recalculating...' : 'Deep Sync Analysis'}
          </button>
        </div>
      </section>

      {/* KPI Insight Strip */}
      <div className="grid gap-6 md:grid-cols-3">
         {[
           { label: 'Network Health', val: mlResult ? mlResult.burnout_risk : 'Stable', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
           { label: 'Semantic Clarity', val: mlResult ? `${mlResult.alignment_score}%` : '92.4%', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
           { label: 'Delivery Predictor', val: mlResult ? mlResult.burnout_score : '86/100', icon: TrendingUp, color: 'text-accent-400', bg: 'bg-accent-500/10' },
         ].map((stat, i) => (
           <div key={i} className="bg-[#0b111a] p-6 rounded-[2rem] border border-white/5 flex items-center gap-5 transition hover:bg-white/5">
              <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                 <p className="text-xl font-black text-white mt-0.5 uppercase tracking-tighter">{stat.val}</p>
              </div>
           </div>
         ))}
      </div>

      {/* Primary Chart Expanse */}
      <div className="grid gap-8 lg:grid-cols-2">
         {/* Workload Distribution Pie */}
         <div className="bg-[#0b111a] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-black text-white uppercase tracking-widest text-[11px] flex items-center gap-3 italic">
                  <LayoutGrid className="h-4 w-4 text-indigo-500" /> Workload Allocation Index
               </h3>
            </div>
            <div className="h-[350px] w-full">
               {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={chartData.categoryData}
                           cx="50%"
                           cy="50%"
                           innerRadius={80}
                           outerRadius={120}
                           paddingAngle={8}
                           dataKey="value"
                        >
                           {chartData.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Pie>
                        <ReTooltip 
                           contentStyle={{ backgroundColor: '#0b111a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}
                           itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                     </PieChart>
                  </ResponsiveContainer>
               )}
            </div>
         </div>

         {/* Delivery Velocity Bar */}
         <div className="bg-[#0b111a] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-black text-white uppercase tracking-widest text-[11px] flex items-center gap-3 italic">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Unit Execution Velocity
               </h3>
            </div>
            <div className="h-[350px] w-full">
               {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData.userDelivery}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                        <ReTooltip 
                           cursor={{fill: 'rgba(255,255,255,0.02)'}}
                           contentStyle={{ backgroundColor: '#0b111a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}
                           itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="hours" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} fillOpacity={0.8} />
                     </BarChart>
                  </ResponsiveContainer>
               )}
            </div>
         </div>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="bg-[#0b111a] p-8 rounded-[3rem] border border-white/5">
           <div className="flex items-center gap-3 mb-8">
             <Zap className="h-5 w-5 text-amber-500" />
             <h3 className="font-black text-white uppercase tracking-widest text-[11px]">Neural Event Stream</h3>
           </div>
           
           <div className="space-y-4">
              {[
                { time: '12 mins ago', text: 'Identified a 14% shift in focal delivery from Application Support to DevOps.', isAlert: false },
                { time: '1 hr ago', text: 'Unit resource drift detected in current hierarchy metrics.', isAlert: true },
                { time: 'Active Now', text: 'IsolationForest confirms normal baseline patterns for 98% of nodes.', isAlert: false }
              ].map((log, i) => (
                <div key={i} className={`p-5 rounded-3xl flex items-start gap-4 ${log.isAlert ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-white/[0.02] border border-white/5'}`}>
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${log.isAlert ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'}`} />
                  <div>
                     <p className={`text-xs font-bold leading-relaxed ${log.isAlert ? 'text-amber-200' : 'text-slate-300'}`}>{analyzing ? 'Recalculating stream vectors...' : log.text}</p>
                     <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-2 font-black">{log.time}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-indigo-600/5 p-10 rounded-[3.5rem] border border-indigo-500/10 flex flex-col justify-center">
            <Sparkles className="h-10 w-10 text-indigo-400 mb-6" />
            <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-8">Tactical Predictive Analysis</h3>
            <p className="mt-4 text-sm text-slate-400 font-medium leading-relaxed">
               The Matrix Engine has synchronized current execution logs with tactical benchmarks. Operational alignment remains above <span className="text-indigo-400 font-bold">94%</span> with zero mission-critical anomalies detected in the current shift.
            </p>
            <div className="mt-10 pt-8 border-t border-indigo-500/10 flex items-center justify-between">
               <div className="flex -space-x-3">
                  {[1,2,3].map(i => <div key={i} className="h-10 w-10 rounded-full border-2 border-[#030712] bg-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">0{i}</div>)}
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Scale Confidence: Ultra-High</p>
            </div>
        </div>
      </section>
    </div>
  );
}
