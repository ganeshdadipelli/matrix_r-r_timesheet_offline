'use client';
// app/(dashboard)/data-tools/page.tsx
import { useEffect, useRef, useState } from 'react';
import { format, subDays } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import {
  AlertTriangle, Calendar, CheckCircle2, Download,
  FileSpreadsheet, FileText, Info, Loader2, Upload, Database,
} from 'lucide-react';

type DownloadFormat = 'csv' | 'xlsx';
type SessionUser = { id?:string; userId?:string; name?:string; email?:string; role?:string; districtId?:string|null; };

export default function DataToolsPage() {
  const [user, setUser]   = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const [fromDate, setFromDate]           = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate]               = useState(format(new Date(), 'yyyy-MM-dd'));
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('xlsx');
  const [downloading, setDownloading]     = useState(false);
  const [templateLoading, setTemplateLoading] = useState<DownloadFormat|null>(null);

  const [file, setFile]               = useState<File | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('matrix_user');
      if (raw && raw !== 'undefined' && raw !== 'null') setUser(JSON.parse(raw));
    } catch { setUser(null); }
    finally  { setReady(true); }
  }, []);

  const canUpload = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  async function handleDownload() {
    if (!fromDate || !toDate) return;
    setDownloading(true);
    try {
      const params = new URLSearchParams({ from:fromDate, to:toDate, format:downloadFormat });
      const res = await apiFetch(`/api/v1/entries/download?${params.toString()}`);
      if (!res.ok) { const d = await res.json().catch(()=>null); alert(d?.error||'Download failed'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `offline-dependencies-${fromDate}-to-${toDate}.${downloadFormat}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed. Please try again.'); }
    finally { setDownloading(false); }
  }

  async function handleTemplateDownload(fmt: DownloadFormat) {
    setTemplateLoading(fmt);
    try {
      const res = await apiFetch(`/api/v1/entries/template?format=${fmt}`);
      if (!res.ok) { const d = await res.json().catch(()=>null); alert(d?.error||'Template download failed'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `offline-dependencies-template.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Template download failed. Please try again.'); }
    finally { setTemplateLoading(null); }
  }

  async function handleUpload() {
    if (!file || !canUpload) return;
    setUploading(true); setUploadResult(null); setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('matrix_token') || '';
      const res = await fetch('/api/v1/entries/upload', {
        method:'POST', credentials:'include',
        headers: token ? { Authorization:`Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setUploadError(data?.error||'Upload failed'); return; }
      setUploadResult(data); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch { setUploadError('Upload failed. Please try again.'); }
    finally { setUploading(false); }
  }

  if (!ready) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-matrix-slate" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background:'rgba(95,111,125,0.2)', border:'1px solid rgba(95,111,125,0.3)' }}>
          <Database className="w-5 h-5 text-matrix-slate" />
        </div>
        <div>
          <h2 className="section-title">Data Tools</h2>
          <p className="section-subtitle">Download multi-date reports · Upload historical field data</p>
        </div>
      </div>

      {/* ── DOWNLOAD ── */}
      <div className="card p-6">
        <div className="flex items-start gap-4 flex-col lg:flex-row justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background:'rgba(214,163,138,0.15)', border:'1px solid rgba(214,163,138,0.25)' }}>
              <Download className="w-5 h-5 text-matrix-peach" />
            </div>
            <div>
              <h3 className="font-semibold text-matrix-cream">Multi-Date Download</h3>
              <p className="text-xs text-matrix-cloud/40 mt-0.5">Export any date range in CSV or Excel</p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 text-xs max-w-md"
            style={{ background:'rgba(95,111,125,0.08)', border:'1px solid rgba(95,111,125,0.18)' }}>
            <p className="font-semibold text-matrix-cloud/80">Excel is recommended</p>
            <p className="mt-1 text-matrix-cloud/50">Gives formatted reports with date-wise sections and totals.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> From Date
            </label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} max={toDate} className="input-field" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> To Date
            </label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} min={fromDate} max={format(new Date(),'yyyy-MM-dd')} className="input-field" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-1.5">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(['xlsx','csv'] as DownloadFormat[]).map(fmt => (
                <button key={fmt} onClick={()=>setDownloadFormat(fmt)}
                  className="rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200"
                  style={downloadFormat===fmt
                    ? { background:'rgba(214,163,138,0.15)', borderColor:'rgba(214,163,138,0.4)', color:'#D6A38A' }
                    : { background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)', color:'#7C8A96' }
                  }>
                  {fmt === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button onClick={handleDownload} disabled={downloading||!fromDate||!toDate}
            className="btn-primary flex items-center gap-2 px-6 disabled:opacity-40">
            {downloading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Downloading…</>
              : <><Download className="w-4 h-4" /> Download {downloadFormat==='xlsx'?'Excel':'CSV'}</>
            }
          </button>
        </div>
      </div>

      {/* ── UPLOAD ── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background:'rgba(95,111,125,0.15)', border:'1px solid rgba(95,111,125,0.25)' }}>
            <Upload className="w-5 h-5 text-matrix-slate" />
          </div>
          <div>
            <h3 className="font-semibold text-matrix-cream">Upload Historical Data</h3>
            <p className="text-xs text-matrix-cloud/40 mt-0.5">Import previous data from CSV or Excel. Uploaded rows are locked immediately.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Template download */}
          <div className="rounded-xl p-4" style={{ background:'rgba(95,111,125,0.07)', border:'1px solid rgba(95,111,125,0.18)' }}>
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-matrix-slate shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-matrix-cream">Download official upload template</p>
                <p className="text-xs text-matrix-cloud/50 mt-1">Fill this template for past dates, then upload it here.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(['xlsx','csv'] as DownloadFormat[]).map(fmt => (
                    <button key={fmt} onClick={()=>handleTemplateDownload(fmt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#A3ADB5' }}>
                      {templateLoading===fmt
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : fmt==='xlsx' ? <FileSpreadsheet className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />
                      }
                      Template {fmt==='xlsx'?'Excel':'CSV'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upload rules */}
          <div className="rounded-xl p-4" style={{ background:'rgba(22,30,34,0.6)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-bold text-matrix-cloud/40 uppercase tracking-widest mb-2.5">Upload Rules</p>
            <ul className="space-y-1.5 text-xs text-matrix-cloud/50">
              {[
                'One row = one district for one date',
                'Date format: YYYY-MM-DD',
                'Online + Offline must equal Total Count',
                'All dependency columns must equal Offline',
                'Existing date + district rows skipped safely',
                'Supports template and flat export files',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-matrix-slate/60 shrink-0">·</span>{rule}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* File drop zone */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-matrix-cloud/50 uppercase tracking-widest mb-2">Select File</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
            style={{ borderColor: file ? 'rgba(214,163,138,0.4)' : 'rgba(95,111,125,0.25)', background: file ? 'rgba(214,163,138,0.05)' : 'transparent' }}>
            <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: file ? '#D6A38A' : '#2E3D44' }} />
            {file ? (
              <div>
                <p className="text-sm font-semibold text-matrix-peach">{file.name}</p>
                <p className="text-xs text-matrix-cloud/30 mt-1">{(file.size/1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-matrix-cloud/40">Click to select CSV or Excel file</p>
                <p className="text-xs text-matrix-cloud/25 mt-1">Accepted: .csv, .xlsx</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={e=>{ setFile(e.target.files?.[0]||null); setUploadResult(null); setUploadError(''); }} />
        </div>

        {/* Alerts */}
        {!canUpload && (
          <div className="mb-4 p-3.5 rounded-lg flex items-center gap-2.5"
            style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-red-300 text-sm">Only Admin or Super Admin can upload historical data</span>
          </div>
        )}
        {uploadError && (
          <div className="mb-4 p-3.5 rounded-lg flex items-center gap-2.5 animate-fade-in"
            style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-red-300 text-sm">{uploadError}</span>
          </div>
        )}
        {uploadResult && (
          <div className="mb-4 rounded-xl p-4 space-y-3 animate-fade-in"
            style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" /> {uploadResult.message}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Rows Inserted', value:uploadResult.data.inserted, color:'#10B981' },
                { label:'Rows Skipped',  value:uploadResult.data.skipped,  color:'#F59E0B' },
              ].map(s=>(
                <div key={s.label} className="rounded-lg p-3 text-center"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-2xl font-bold font-mono" style={{ color:s.color }}>{s.value}</p>
                  <p className="text-xs text-matrix-cloud/40 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {uploadResult.data.errors?.length>0 && (
              <details>
                <summary className="text-xs font-medium text-matrix-cloud/50 cursor-pointer">
                  View {uploadResult.data.errors.length} issues
                </summary>
                <div className="mt-2 max-h-44 overflow-y-auto space-y-1">
                  {uploadResult.data.errors.map((err:string,i:number)=>(
                    <p key={i} className="text-xs text-red-400 font-mono px-2 py-1 rounded"
                      style={{ background:'rgba(239,68,68,0.08)' }}>{err}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <button onClick={handleUpload} disabled={!file||uploading||!canUpload}
          className="btn-primary flex items-center gap-2 px-6 disabled:opacity-40">
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
            : <><Upload className="w-4 h-4" /> Upload & Import</>
          }
        </button>
      </div>
    </div>
  );
}
