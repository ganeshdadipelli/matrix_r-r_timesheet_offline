'use client';
// app/(dashboard)/insights/page.tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/utils/apiFetch';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Target,
  Search, Brain, RefreshCw, BarChart2, ArrowUp, ArrowDown,
  CheckCircle, Info,
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
interface RootCause {
  label:string; value:number; type:string; percentage:number;
}
interface DailyPoint {
  date:string; offline:number; total:number;
  internal:number; external:number; offlinePct:number;
}
interface Insights {
  period:{ days:number; totalEntries:number };
  summary:{ totalOffline:number; avgOfflinePct:number; districtsReporting:number };
  predictions:Prediction[];
  anomalies:Anomaly[];
  riskScores:RiskScore[];
  rootCauses:RootCause[];
  dailyTrend:DailyPoint[];
}

const RISK_STYLE: Record<string, { card:string; bar:string }> = {
  critical: { card:'bg-red-50 border-red-300',    bar:'#DC2626' },
  high:     { card:'bg-orange-50 border-orange-300', bar:'#EA580C' },
  medium:   { card:'bg-yellow-50 border-yellow-300', bar:'#D97706' },
  low:      { card:'bg-green-50 border-green-300',  bar:'#16A34A' },
  unknown:  { card:'bg-slate-50 border-slate-200',  bar:'#94A3B8' },
};
const RISK_TEXT: Record<string, string> = {
  critical:'text-red-700', high:'text-orange-700', medium:'text-yellow-700', low:'text-green-700', unknown:'text-slate-600',
};
const SEV_STYLE: Record<string, string> = {
  critical:'bg-red-100 text-red-700', high:'bg-orange-100 text-orange-700', medium:'bg-yellow-100 text-yellow-700',
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend==='rising')  return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (trend==='falling') return <TrendingDown className="w-4 h-4 text-green-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
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
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [days]);

  const TABS = [
    { key:'risk',        label:'Risk Scores',   Icon: Target     },
    { key:'predictions', label:'Predictions',   Icon: Brain      },
    { key:'anomalies',   label:'Anomalies',     Icon: AlertTriangle },
    { key:'rootcause',   label:'Root Causes',   Icon: Search     },
    { key:'trend',       label:'Daily Trend',   Icon: BarChart2  },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-600" /> ML Insights
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Auto-analyzes daily field data · Predictions · Anomalies · Risk Scoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Period:</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-field w-36 text-sm">
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="btn-secondary p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border border-amber-200 bg-amber-50 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 text-sm font-medium">{error}</p>
            <p className="text-amber-600 text-xs mt-1">
              Insights are computed from daily entries. Add at least 5 days of field data to see predictions and anomaly detection.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-16 flex flex-col items-center gap-4">
          <Brain className="w-12 h-12 text-primary-300 animate-pulse" />
          <div className="text-center">
            <p className="text-slate-600 font-medium">Computing ML insights...</p>
            <p className="text-slate-400 text-sm mt-1">Analyzing field data from all 13 districts</p>
          </div>
        </div>
      ) : insights ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Avg Offline %',         v: `${insights.summary.avgOfflinePct}%`,     color:'text-red-600',     icon: <TrendingUp className="w-5 h-5"/> },
              { label:'Anomalies (last 14d)',   v: insights.anomalies.length,                color:'text-orange-600',  icon: <AlertTriangle className="w-5 h-5"/> },
              { label:'High Risk Districts',    v: insights.riskScores.filter(r=>r.level==='critical'||r.level==='high').length, color:'text-red-700', icon: <Target className="w-5 h-5"/> },
              { label:'Data Points Analyzed',   v: insights.period.totalEntries,             color:'text-primary-600', icon: <BarChart2 className="w-5 h-5"/> },
            ].map(c => (
              <div key={c.label} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide leading-tight">{c.label}</p>
                    <p className={`text-3xl font-bold mt-1.5 ${c.color}`}>{c.v}</p>
                  </div>
                  <div className={`${c.color} opacity-40`}>{c.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto">
            {TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  tab===key ? 'bg-white shadow-sm text-primary-700' : 'text-slate-600 hover:text-slate-800'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* ── RISK SCORES ── */}
          {tab==='risk' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-slate-700 mb-1">District Risk Scores</h3>
                <p className="text-xs text-slate-400 mb-4">Weighted score (0–100) based on avg offline %, recent trend, rising slope, and instability</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insights.riskScores} layout="vertical" margin={{left:90,right:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0,100]} tick={{fontSize:11}} unit="%" />
                    <YAxis dataKey="districtName" type="category" tick={{fontSize:11}} width={90} />
                    <Tooltip formatter={(v)=>[`${v}/100`,'Risk Score']} />
                    <Bar dataKey="score" radius={[0,4,4,0]}>
                      {insights.riskScores.map((r,i)=>(
                        <Cell key={i} fill={RISK_STYLE[r.level]?.bar||'#94A3B8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {insights.riskScores.map(r => (
                  <div key={r.districtId} className={`card p-4 border ${RISK_STYLE[r.level]?.card||''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`font-bold text-sm ${RISK_TEXT[r.level]}`}>{r.districtName}</p>
                        <p className="text-xs text-slate-500">{r.districtCode}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${RISK_TEXT[r.level]}`}>{r.score}</p>
                        <p className={`text-xs font-semibold uppercase ${RISK_TEXT[r.level]}`}>{r.level}</p>
                      </div>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-1.5 mb-2">
                      <div className="h-1.5 rounded-full" style={{width:`${r.score}%`, backgroundColor:RISK_STYLE[r.level]?.bar}}/>
                    </div>
                    {r.factors.length===0
                      ? <p className="text-xs text-slate-400 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500"/> No significant risks</p>
                      : r.factors.map((f,i)=><p key={i} className="text-xs text-slate-600">• {f}</p>)
                    }
                    <div className="flex justify-between mt-2 pt-2 border-t border-white/50 text-xs text-slate-500">
                      <span>Avg: <strong>{r.avgOfflinePct}%</strong></span>
                      <span>Recent: <strong>{r.recentOfflinePct}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PREDICTIONS ── */}
          {tab==='predictions' && (
            <div className="space-y-4">
              <div className="card p-4 border border-blue-200 bg-blue-50 flex items-start gap-3">
                <Brain className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Predictions use 7-day moving average + linear regression on your actual field data.
                  These update automatically as your team submits new daily entries. Minimum 7 days of data per district for best accuracy.
                </p>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {['District','Historical Avg','Predicted Tomorrow','Predicted %','Trend','Data Days'].map(h=>(
                          <th key={h} className="table-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {insights.predictions.map(p=>(
                        <tr key={p.districtId} className="hover:bg-slate-50">
                          <td className="table-td font-sans font-semibold text-primary-700">{p.districtName}</td>
                          <td className="table-td font-mono">{p.avgOffline}</td>
                          <td className="table-td font-mono font-bold text-orange-700 text-base">{p.predictedOffline}</td>
                          <td className="table-td">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.predictedPct<10?'bg-green-100 text-green-700':
                              p.predictedPct<15?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'
                            }`}>{p.predictedPct}%</span>
                          </td>
                          <td className="table-td">
                            <div className="flex items-center gap-1.5">
                              <TrendIcon trend={p.trend} />
                              <span className={`text-sm font-medium ${
                                p.trend==='rising'?'text-red-600':p.trend==='falling'?'text-green-600':'text-slate-500'
                              }`}>{p.trend}</span>
                              <span className="text-xs text-slate-400">({p.trendValue>0?'+':''}{p.trendValue}/day)</span>
                            </div>
                          </td>
                          <td className="table-td font-mono text-slate-500">{p.dataPoints}</td>
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
            <div className="space-y-4">
              <div className="card p-4 border border-orange-200 bg-orange-50 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-700">
                  Z-score anomaly detection compares each day's offline count to that district's historical average.
                  Z ≥ 1.5 = Medium, Z ≥ 2 = High, Z ≥ 3 = Critical. Checks last 14 days automatically.
                </p>
              </div>
              {insights.anomalies.length===0 ? (
                <div className="card p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-semibold">No anomalies detected</p>
                  <p className="text-slate-400 text-sm mt-1">All districts are within normal range</p>
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
                        {insights.anomalies.map((a,i)=>(
                          <tr key={i} className={`hover:bg-slate-50 ${a.severity==='critical'?'bg-red-50':''}`}>
                            <td className="table-td">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEV_STYLE[a.severity]||''}`}>
                                {a.severity}
                              </span>
                            </td>
                            <td className="table-td font-sans font-semibold text-primary-700">{a.districtName}</td>
                            <td className="table-td font-mono text-xs">{a.date}</td>
                            <td className="table-td font-mono font-bold text-red-700">{a.offlineCount}</td>
                            <td className="table-td font-mono text-slate-500">{a.expected}</td>
                            <td className="table-td font-mono">
                              <span className={a.zScore>0?'text-red-600':'text-green-600'}>
                                {a.zScore>0?'+':''}{a.zScore}
                              </span>
                            </td>
                            <td className="table-td">
                              <div className="flex items-center gap-1">
                                {a.direction==='above'
                                  ? <ArrowUp className="w-3.5 h-3.5 text-red-500"/>
                                  : <ArrowDown className="w-3.5 h-3.5 text-green-500"/>
                                }
                                <span className="text-xs text-slate-600">{Math.abs(a.offlineCount-a.expected)} cameras</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ROOT CAUSES ── */}
          {tab==='rootcause' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-slate-700 mb-1">Top Dependency Causes</h3>
                <p className="text-xs text-slate-400 mb-4">Aggregated from all {insights.period.totalEntries} daily entries submitted by field team</p>
                {insights.rootCauses.length===0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No dependency data yet. Field team needs to submit entries.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={insights.rootCauses} layout="vertical" margin={{left:140,right:30}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{fontSize:11}} />
                      <YAxis dataKey="label" type="category" tick={{fontSize:11}} width={140} />
                      <Tooltip formatter={(v,_,p)=>[`${v} cameras (${p.payload.percentage}%)`,'Affected']} />
                      <Bar dataKey="value" radius={[0,4,4,0]}>
                        {insights.rootCauses.map((c,i)=>(
                          <Cell key={i} fill={c.type==='internal'?'#F59E0B':'#0F4C81'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="flex items-center gap-6 mt-3 justify-center">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-3 h-3 rounded-sm bg-amber-500"/>Internal Dependency
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-3 h-3 rounded-sm bg-primary-900"/>External Dependency
                  </div>
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
                        <tr key={c.label} className="hover:bg-slate-50">
                          <td className="table-td text-center font-bold text-slate-300">#{i+1}</td>
                          <td className="table-td font-sans font-medium">{c.label}</td>
                          <td className="table-td">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.type==='internal'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>
                              {c.type}
                            </span>
                          </td>
                          <td className="table-td font-mono font-bold">{c.value.toLocaleString()}</td>
                          <td className="table-td font-mono">{c.percentage}%</td>
                          <td className="table-td w-32">
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div className="h-2 rounded-full" style={{width:`${Math.min(100,c.percentage*3)}%`,backgroundColor:c.type==='internal'?'#F59E0B':'#0F4C81'}}/>
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
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-slate-700 mb-1">Daily Offline Trend — All Districts Combined</h3>
                <p className="text-xs text-slate-400 mb-4">Total offline cameras per day across all 13 districts</p>
                {insights.dailyTrend.length===0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No data yet for the selected period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={insights.dailyTrend} margin={{top:5,right:20,left:0,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)} />
                      <YAxis tick={{fontSize:11}} />
                      <Tooltip labelFormatter={d=>`Date: ${d}`} />
                      <Legend />
                      <Line type="monotone" dataKey="offline" name="Total Offline" stroke="#DC2626" strokeWidth={2} dot={false} activeDot={{r:5}}/>
                      <Line type="monotone" dataKey="internal" name="Internal Deps" stroke="#F59E0B" strokeWidth={1.5} dot={false} strokeDasharray="4 4"/>
                      <Line type="monotone" dataKey="external" name="External Deps" stroke="#0F4C81" strokeWidth={1.5} dot={false} strokeDasharray="4 4"/>
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
                          <tr key={d.date} className="hover:bg-slate-50">
                            <td className="table-td font-mono">{d.date}</td>
                            <td className="table-td font-mono">{d.total.toLocaleString()}</td>
                            <td className="table-td font-mono font-bold text-red-700">{d.offline.toLocaleString()}</td>
                            <td className="table-td">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                d.offlinePct<10?'bg-green-100 text-green-700':
                                d.offlinePct<15?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'
                              }`}>{d.offlinePct}%</span>
                            </td>
                            <td className="table-td font-mono text-amber-700">{d.internal.toLocaleString()}</td>
                            <td className="table-td font-mono text-blue-700">{d.external.toLocaleString()}</td>
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