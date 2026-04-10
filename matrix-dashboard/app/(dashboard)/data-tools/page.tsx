'use client';

import { useEffect, useRef, useState } from 'react';
import { format, subDays } from 'date-fns';
import { apiFetch } from '@/lib/utils/apiFetch';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Upload,
} from 'lucide-react';

type DownloadFormat = 'csv' | 'xlsx';

type SessionUser = {
  id?: string;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  districtId?: string | null;
};

export default function DataToolsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('xlsx');
  const [downloading, setDownloading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState<DownloadFormat | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('matrix_user');
      if (raw && raw !== 'undefined' && raw !== 'null') {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      }
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  const canUpload = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  async function handleDownload() {
    if (!fromDate || !toDate) return;

    setDownloading(true);
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        format: downloadFormat,
      });

      const res = await apiFetch(`/api/v1/entries/download?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Download failed');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-dependencies-${fromDate}-to-${toDate}.${downloadFormat}`;
      a.click();

      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleTemplateDownload(formatType: DownloadFormat) {
    setTemplateLoading(formatType);

    try {
      const res = await apiFetch(`/api/v1/entries/template?format=${formatType}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Template download failed');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-dependencies-template.${formatType}`;
      a.click();

      URL.revokeObjectURL(url);
    } catch {
      alert('Template download failed. Please try again.');
    } finally {
      setTemplateLoading(null);
    }
  }

  async function handleUpload() {
    if (!file) return;

    if (!canUpload) {
      setUploadError('Only Admin or Super Admin can upload historical data');
      return;
    }

    setUploading(true);
    setUploadResult(null);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('matrix_token') || '';

      const res = await fetch('/api/v1/entries/upload', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data?.error || 'Upload failed');
        return;
      }

      setUploadResult(data);
      setFile(null);

      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Data Tools</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Download multi-date reports and upload historical offline dependency data
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Multi-Date Download</h3>
                <p className="text-xs text-slate-500">
                  Export any date range in CSV or Excel format
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 max-w-md">
            <p className="font-semibold">Excel is recommended</p>
            <p className="mt-1">
              Excel gives the better formatted report with date-wise sections and totals.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDownloadFormat('xlsx')}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  downloadFormat === 'xlsx'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                Excel (.xlsx)
              </button>

              <button
                onClick={() => setDownloadFormat('csv')}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  downloadFormat === 'csv'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                CSV (.csv)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading || !fromDate || !toDate}
            className="btn-primary flex items-center gap-2 px-6 disabled:opacity-40"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download {downloadFormat === 'xlsx' ? 'Excel' : 'CSV'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Upload className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Upload Historical Data</h3>
            <p className="text-xs text-slate-500">
              Import previous data from CSV or Excel. Uploaded rows are locked immediately.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Download official upload template</p>
                <p className="text-xs text-blue-700 mt-1">
                  Fill this template for past dates, then upload it here. District code is preferred, but district name also works.
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => handleTemplateDownload('xlsx')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    {templateLoading === 'xlsx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Template Excel
                  </button>

                  <button
                    onClick={() => handleTemplateDownload('csv')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    {templateLoading === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    Template CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Upload Rules
            </p>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>• One row = one district for one date</li>
              <li>• Date format should be YYYY-MM-DD</li>
              <li>• Online + Offline must equal Total Count</li>
              <li>• All dependency columns together must equal Offline</li>
              <li>• Existing date + district rows are skipped safely</li>
              <li>• Supports both template files and normal flat export files</li>
            </ul>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Select file</label>
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            {file ? (
              <div>
                <p className="text-sm font-medium text-primary-700">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500">Click to select CSV or Excel file</p>
                <p className="text-xs text-slate-400 mt-1">Accepted: .csv, .xlsx</p>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setUploadResult(null);
              setUploadError('');
            }}
          />
        </div>

        {!canUpload && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Only Admin or Super Admin can upload historical data
          </div>
        )}

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {uploadError}
          </div>
        )}

        {uploadResult && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {uploadResult.message}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-700">{uploadResult.data.inserted}</p>
                <p className="text-xs text-slate-500">Rows Inserted</p>
              </div>

              <div className="bg-white rounded-lg p-3 text-center border border-amber-200">
                <p className="text-2xl font-bold text-amber-700">{uploadResult.data.skipped}</p>
                <p className="text-xs text-slate-500">Rows Skipped</p>
              </div>
            </div>

            {uploadResult.data.errors?.length > 0 && (
              <details>
                <summary className="text-xs font-medium text-slate-600 cursor-pointer">
                  View {uploadResult.data.errors.length} issues
                </summary>
                <div className="mt-2 max-h-44 overflow-y-auto space-y-1">
                  {uploadResult.data.errors.map((error: string, index: number) => (
                    <p key={index} className="text-xs text-red-600 font-mono bg-red-50 px-2 py-1 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading || !canUpload}
          className="btn-primary flex items-center gap-2 px-6 disabled:opacity-40"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Upload & Import
            </>
          )}
        </button>
      </div>
    </div>
  );
}