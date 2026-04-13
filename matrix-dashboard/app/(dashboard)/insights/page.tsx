'use client';
// app/(dashboard)/insights/page.tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Target,
  Search, Brain, RefreshCw, BarChart2, ArrowUp, ArrowDown,
  CheckCircle, Info, Sparkles, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Cell, Legend,
} from 'recharts';

interface Prediction {
  districtId:string; districtName:string; districtCode:string;
  predictedOffline:number; predictedPct:number;
  avgOffline:number; avgOfflinePct:number;
  trend:string; trendValue:number; dataPoints:number;
}
interface Anomaly {
  districtId:string; districtName:string; date:string;
  offlineCount:number; expected:number; zScore:number;
  severity:string; direction:string;
}
interface RiskScore {
  districtId:string; districtName:string; districtCode:string;
  score:number; level:string; factors:string[];
  avgOfflinePct:number; recentOfflinePct:number;
}
interface RootCause { label:string; value:number; type:string; percentage:number; }
interface DailyPoint { date:string; offline:number; total:number; internal:number; external:number; offlinePct:number; }
interface Insights {
  period:{ days:number; totalEntries:number };
  summary:{ totalOffline:number; avgOfflinePct:number; districtsReporting:number };
  predictions:Prediction[]; anomalies:Anomaly[]; riskScores:RiskScore[];
  rootCauses:RootCause[]; dailyTrend:DailyPoint[];
}

const RISK_CONFIG: Record<string, { bar:string; bg:string; text:string; border:string }> = {
  critical: { bar:'#EF4444', bg:'rgba(239,68,68,0.08)',   text:'#FCA5A5', border:'rgba(239,68,68,0.25)' },
  high:     { bar:'#F97316', bg:'rgba(249,115,22,0.08)',  text:'#FDBA74', border:'rgba(249,115,22,0.25)' },
  medium:   { bar:'#F59E0B', bg:'rgba(245,158,11,0.08)',  text:'#FCD34D', border:'rgba(245,158,11,0.25)' },
  low:      { bar:'#10B981', bg:'rgba(16,185,129,0.08)',  text:'#6EE7B7', border:'rgba(16,185,129,0.25)' },
  unknown:  { bar:'#5F6F7D', bg:'rgba(95,111,125,0.08)',  text:'#A3ADB5', border:'rgba(95,111,125,0.25)' },
};
const SEV_CONFIG: Record<string, { bg:string; text:string; border:string }> = {
  critical: { bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.3)' },
  high:     { bg:'rgba(249,115,22,0.12)',  text:'#FDBA74', border:'rgba(249,115,22,0.3)' },
  medium:   { bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.3)' },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-glass px-4 py-3 text-sm shadow-matrix-lg">
      <p className="text-matrix-cloud/50 text-xs mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend==='rising')  return <TrendingUp className="w-4 h-4 text-red-400" />;
  if (trend==='falling') return <TrendingDown className="w-4 h-4 text-emerald-400" />;
  return <Minus className="w-4 h-4 text-matrix-cloud/40" />;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insights|null>(null);
  const [loading, setLoading]   = useState(true);
  const [days, setDays]         = useState(30);
  const [tab, setTab]           = useState<'risk'|'predictions'|'anomalies'|'rootcause'|'trend'>('risk');
  const [error, setError]       = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res  = await apiFetch(`/api/v1/ml/insights?days=${days}`);
      const data = await res.json();
      if (data.success) setInsights(data.data);
      else setError(data.error || 'Failed to load insights');
    } catch { setError('Network error loading insights'); }
    finally  { setLoading(false); }
  }

  useEffect(() => { load(); }, [days]);

  const TABS = [
    { key:'risk',        label:'Risk Scores',  Icon: Target       },
    { key:'predictions', label:'Predictions',  Icon: Brain        },
    { key:'anomalies',   label:'Anomalies',    Icon: AlertTriangle },
    { key:'rootcause',   label:'Root Causes',  Icon: Search       },
    { key:'trend',       label:'Daily Trend',  Icon: Activity     },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(95,111,125,0.3), rgba(214,163,138,0.2))', border: '1px solid rgba(214,163,138,0.2)' }}>
            <Sparkles className="w-5 h-5 text-matrix-peach" />
          </div>
          <div>
            <h2 className="section-title">ML Insights</h2>
            <p className="section-subtitle">Auto-analyzes field data · Predictions · Anomalies · Risk Scoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-matrix-cloud/50 font-semibold uppercase tracking-widest whitespace-nowrap">Period</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-field w-36 text-sm">
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="btn-secondary p-2" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 flex items-start gap-3 animate-fade-in"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium">{error}</p>
            <p className="text-amber-400/60 text-xs mt-1">
              Insights are computed from daily entries. Add at least 5 days of field data to see predictions.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card p-20 flex flex-col items-center gap-5 animate-fade-in">
          <div className="relative">
            <Brain className="w-14 h-14 text-matrix-slate/30" />
            <div className="absolute -inset-2 rounded-full border border-matrix-peach/20 animate-ping"
              style={{ animationDuration: '2s' }} />
          </div>
          <div className="text-center">
            <p className="text-matrix-cream font-semibold">Computing ML insights…</p>
            <p className="text-matrix-cloud/40 text-sm mt-1">Analyzing field data from all 13 districts</p>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-matrix-peach/40 animate-pulse"
                style={{ animationDelay: `${i*200}ms` }} />
            ))}
          </div>
        </div>
      ) : insights ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Avg Offline %',       v: `${insights.summary.avgOfflinePct}%`,  color:'#EF4444', Icon: TrendingUp     },
              { label:'Anomalies (14d)',      v: insights.anomalies.length,             color:'#F97316', Icon: AlertTriangle  },
              { label:'High Risk Districts', v: insights.riskScores.filter(r=>r.level==='critical'||r.level==='high').length, color:'#EF4444', Icon: Target },
              { label:'Data Points',         v: insights.period.totalEntries,           color:'#D6A38A', Icon: BarChart2      },
            ].map((c, i) => (
              <div key={c.label} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i*80}ms`, animationFillMode:'both' }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-3 translate-x-3"
                  style={{ background: `radial-gradient(circle, ${c.color} 0%, transparent 70%)` }} />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest">{c.label}</p>
                    <p className="text-3xl font-bold mt-1.5 font-mono" style={{ color: c.color }}>{c.v}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${c.color}15`, border: `1px solid ${c.color}25` }}>
                    <c.Icon className="w-4.5 h-4.5" style={{ color: c.color, width:'18px', height:'18px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="tab-bar overflow-x-auto max-w-full">
            {TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`tab-item ${tab===key ? 'tab-item-active' : ''}`}>
                <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
              </button>
            ))}
          </div>

          {/* ── RISK SCORES ── */}
          {tab==='risk' && (
            <div className="space-y-5 animate-fade-in">
              <div className="card p-5">
                <h3 className="font-semibold text-matrix-cream mb-0.5">District Risk Scores</h3>
                <p className="text-xs text-matrix-cloud/40 mb-5">Weighted score (0–100): avg offline · recent trend · rising slope · instability</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={insights.riskScores} layout="vertical" margin={{left:95,right:25}}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0,100]} tick={{fontSize:10, fill:'#A3ADB5'}} unit="%" />
                    <YAxis dataKey="districtName" type="category" tick={{fontSize:11, fill:'#A3ADB5'}} width={95} />
                    <Tooltip content={<CustomTooltip />} formatter={(v)=>[`${v}/100`,'Risk Score']} />
                    <Bar dataKey="score" radius={[0,5,5,0]}>
                      {insights.riskScores.map((r,i)=>(
                        <Cell key={i} fill={RISK_CONFIG[r.level]?.bar||'#5F6F7D'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {insights.riskScores.map(r => {
                  const cfg = RISK_CONFIG[r.level] || RISK_CONFIG.unknown;
                  return (
                    <div key={r.districtId} className="card-glow p-4 animate-fade-in"
                      style={{ borderColor: cfg.border, background: cfg.bg }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-sm" style={{ color: cfg.text }}>{r.districtName}</p>
                          <p className="text-xs text-matrix-cloud/30 font-mono">{r.districtCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold font-mono" style={{ color: cfg.text }}>{r.score}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.text }}>{r.level}</p>
                        </div>
                      </div>
                      <div className="w-full rounded-full h-1.5 mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width:`${r.score}%`, background: cfg.bar }} />
                      </div>
                      {r.factors.length===0
                        ? <p className="text-xs text-matrix-cloud/40 flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> No significant risks
                          </p>
                        : r.factors.map((f,i)=>(
                            <p key={i} className="text-xs text-matrix-cloud/60 flex items-start gap-1.5">
                              <span style={{ color: cfg.text }} className="shrink-0">·</span>{f}
                            </p>
                          ))
                      }
                      <div className="flex justify-between mt-3 pt-2.5 text-xs text-matrix-cloud/40"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span>Avg: <strong className="text-matrix-cloud/70 font-mono">{r.avgOfflinePct}%</strong></span>
                        <span>Recent: <strong className="text-matrix-cloud/70 font-mono">{r.recentOfflinePct}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PREDICTIONS ── */}
          {tab==='predictions' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(95,111,125,0.08)', border: '1px solid rgba(95,111,125,0.2)' }}>
                <Brain className="w-4 h-4 text-matrix-slate shrink-0 mt-0.5" />
                <p className="text-sm text-matrix-cloud/70">
                  Predictions use 7-day moving average + linear regression on actual field data.
                  Updates automatically as field team submits entries. Minimum 7 days per district for accuracy.
                </p>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {['District','Hist. Avg','Predicted Tomorrow','Predicted %','Trend','Data Days'].map(h=>(
                          <th key={h} className="table-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {insights.predictions.map(p=>(
                        <tr key={p.districtId} className="table-tr-hover">
                          <td className="table-td font-sans font-semibold text-matrix-cream">{p.districtName}</td>
                          <td className="table-td font-mono text-matrix-cloud/60">{p.avgOffline}</td>
                          <td className="table-td font-mono font-bold text-matrix-peach text-base">{p.predictedOffline}</td>
                          <td className="table-td">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                              p.predictedPct<10 ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' :
                              p.predictedPct<15 ? 'bg-amber-900/40 text-amber-300 border-amber-700/40' :
                              'bg-red-900/40 text-red-300 border-red-700/40'
                            }`}>{p.predictedPct}%</span>
                          </td>
                          <td className="table-td">
                            <div className="flex items-center gap-1.5">
                              <TrendIcon trend={p.trend} />
                              <span className={`text-sm font-medium ${
                                p.trend==='rising'?'text-red-400':p.trend==='falling'?'text-emerald-400':'text-matrix-cloud/50'
                              }`}>{p.trend}</span>
                              <span className="text-xs text-matrix-cloud/30 font-mono">({p.trendValue>0?'+':''}{p.trendValue}/day)</span>
                            </div>
                          </td>
                          <td className="table-td font-mono text-matrix-cloud/40">{p.dataPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ANOMALIES ── */}
          {tab==='anomalies' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)' }}>
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-sm text-matrix-cloud/70">
                  Z-score anomaly detection compares each day's offline count to historical average.
                  Z ≥ 1.5 = Medium · Z ≥ 2 = High · Z ≥ 3 = Critical. Checks last 14 days automatically.
                </p>
              </div>
              {insights.anomalies.length===0 ? (
                <div className="card p-16 text-center">
                  <CheckCircle className="w-14 h-14 text-emerald-500/30 mx-auto mb-4" />
                  <p className="text-matrix-cream font-semibold">No anomalies detected</p>
                  <p className="text-matrix-cloud/30 text-sm mt-1">All districts are within normal range</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {['Severity','District','Date','Actual','Expected','Z-Score','Deviation'].map(h=>(
                            <th key={h} className="table-th">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {insights.anomalies.map((a,i)=>{
                          const scfg = SEV_CONFIG[a.severity];
                          return (
                            <tr key={i} className="table-tr-hover">
                              <td className="table-td">
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
                                  style={{ background: scfg?.bg, color: scfg?.text, borderColor: scfg?.border }}>
                                  {a.severity}
                                </span>
                              </td>
                              <td className="table-td font-sans font-semibold text-matrix-cream">{a.districtName}</td>
                              <td className="table-td font-mono text-xs text-matrix-cloud/50">{a.date}</td>
                              <td className="table-td font-mono font-bold text-red-400">{a.offlineCount}</td>
                              <td className="table-td font-mono text-matrix-cloud/50">{a.expected}</td>
                              <td className="table-td font-mono">
                                <span className={a.zScore>0?'text-red-400':'text-emerald-400'}>
                                  {a.zScore>0?'+':''}{a.zScore}
                                </span>
                              </td>
                              <td className="table-td">
                                <div className="flex items-center gap-1">
                                  {a.direction==='above'
                                    ? <ArrowUp className="w-3.5 h-3.5 text-red-400"/>
                                    : <ArrowDown className="w-3.5 h-3.5 text-emerald-400"/>
                                  }
                                  <span className="text-xs text-matrix-cloud/50">{Math.abs(a.offlineCount-a.expected)} cameras</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ROOT CAUSES ── */}
          {tab==='rootcause' && (
            <div className="space-y-4 animate-fade-in">
              <div className="card p-5">
                <h3 className="font-semibold text-matrix-cream mb-0.5">Top Dependency Causes</h3>
                <p className="text-xs text-matrix-cloud/40 mb-5">
                  Aggregated from {insights.period.totalEntries} daily entries — field team submissions
                </p>
                {insights.rootCauses.length===0 ? (
                  <p className="text-matrix-cloud/30 text-sm text-center py-10">No dependency data yet. Field team needs to submit entries.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={insights.rootCauses} layout="vertical" margin={{left:145,right:30}}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{fontSize:10, fill:'#A3ADB5'}} />
                      <YAxis dataKey="label" type="category" tick={{fontSize:11, fill:'#A3ADB5'}} width={145} />
                      <Tooltip content={<CustomTooltip />} formatter={(v,_,p)=>[`${v} cameras (${p.payload.percentage}%)`,'Affected']} />
                      <Bar dataKey="value" radius={[0,5,5,0]}>
                        {insights.rootCauses.map((c,i)=>(
                          <Cell key={i} fill={c.type==='internal'?'#D6A38A':'#5F6F7D'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="flex items-center gap-6 mt-4 justify-center">
                  {[['Internal Dependency','#D6A38A'],['External Dependency','#5F6F7D']].map(([label,color])=>(
                    <div key={label} className="flex items-center gap-2 text-xs text-matrix-cloud/50">
                      <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {['#','Dependency','Type','Total Cameras','Share %','Impact'].map(h=>(
                          <th key={h} className="table-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {insights.rootCauses.map((c,i)=>(
                        <tr key={c.label} className="table-tr-hover">
                          <td className="table-td text-center font-bold text-matrix-border font-mono">#{i+1}</td>
                          <td className="table-td font-sans font-medium text-matrix-cream">{c.label}</td>
                          <td className="table-td">
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
                              style={c.type==='internal'
                                ? { background:'rgba(214,163,138,0.12)', color:'#D6A38A', borderColor:'rgba(214,163,138,0.25)' }
                                : { background:'rgba(95,111,125,0.12)',  color:'#A3ADB5', borderColor:'rgba(95,111,125,0.25)' }
                              }>
                              {c.type}
                            </span>
                          </td>
                          <td className="table-td font-mono font-bold text-matrix-cream">{c.value.toLocaleString()}</td>
                          <td className="table-td font-mono text-matrix-cloud/50">{c.percentage}%</td>
                          <td className="table-td w-32">
                            <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <div className="h-1.5 rounded-full transition-all"
                                style={{ width:`${Math.min(100,c.percentage*3)}%`, background: c.type==='internal'?'#D6A38A':'#5F6F7D' }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── DAILY TREND ── */}
          {tab==='trend' && (
            <div className="space-y-4 animate-fade-in">
              <div className="card p-5">
                <h3 className="font-semibold text-matrix-cream mb-0.5">Daily Offline Trend — All Districts Combined</h3>
                <p className="text-xs text-matrix-cloud/40 mb-5">Total offline cameras per day across all 13 districts</p>
                {insights.dailyTrend.length===0 ? (
                  <p className="text-matrix-cloud/30 text-sm text-center py-10">No data yet for the selected period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={insights.dailyTrend} margin={{top:5,right:20,left:0,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{fontSize:10, fill:'#A3ADB5'}} tickFormatter={d=>d.slice(5)} />
                      <YAxis tick={{fontSize:10, fill:'#A3ADB5'}} />
                      <Tooltip content={<CustomTooltip />} labelFormatter={d=>`Date: ${d}`} />
                      <Legend />
                      <Line type="monotone" dataKey="offline"   name="Total Offline"  stroke="#EF4444" strokeWidth={2}   dot={false} activeDot={{r:5, fill:'#EF4444'}} />
                      <Line type="monotone" dataKey="internal"  name="Internal Deps"  stroke="#D6A38A" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
                      <Line type="monotone" dataKey="external"  name="External Deps"  stroke="#5F6F7D" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              {insights.dailyTrend.length>0 && (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {['Date','Total Cameras','Offline','Offline %','Internal','External'].map(h=>(
                            <th key={h} className="table-th">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...insights.dailyTrend].reverse().map(d=>(
                          <tr key={d.date} className="table-tr-hover">
                            <td className="table-td font-mono text-matrix-cloud/50">{d.date}</td>
                            <td className="table-td font-mono text-matrix-cloud/60">{d.total.toLocaleString()}</td>
                            <td className="table-td font-mono font-bold text-red-400">{d.offline.toLocaleString()}</td>
                            <td className="table-td">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                                d.offlinePct<10?'bg-emerald-900/40 text-emerald-300 border-emerald-700/40':
                                d.offlinePct<15?'bg-amber-900/40 text-amber-300 border-amber-700/40':
                                'bg-red-900/40 text-red-300 border-red-700/40'
                              }`}>{d.offlinePct}%</span>
                            </td>
                            <td className="table-td font-mono text-matrix-peach">{d.internal.toLocaleString()}</td>
                            <td className="table-td font-mono text-matrix-slate">{d.external.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
