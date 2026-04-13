import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

const INTERNAL_COLUMNS = [
  { key: 'cat6Cable',              label: 'CAT6 Cable' },
  { key: 'threeCorepower',         label: '3-Core Power' },
  { key: 'gponIssues',             label: 'GPON Issues' },
  { key: 'ofcIssues',              label: 'OFC Issues' },
  { key: 'cameraStoreReplacement', label: 'Cam Store/Repl' },
  { key: 'camerasFluctuating',     label: 'Cam Fluctuating' },
  { key: 'needToCheck',            label: 'Need to Check' },
  { key: 'fiberRequired',          label: 'Fiber Required' },
  { key: 'hydraLadder',            label: 'Hydra Ladder' },
  { key: 'mcbIssue',               label: 'MCB Issue' },
  { key: 'switch8portIssue',       label: '8-Port Switch' },
] as const;

const EXTERNAL_COLUMNS = [
  { key: 'roadExtensionConstruction', label: 'Road Extension' },
  { key: 'noOlt',              label: 'No OLT' },
  { key: 'popDown',            label: 'Pop Down' },
  { key: 'jbAccident',         label: 'JB Accident' },
  { key: 'renovation',         label: 'Renovation' },
  { key: 'powerDisconnection', label: 'Power Disconn.' },
  { key: 'dgpOffice',          label: 'DGP Office' },
  { key: 'needPeerIp',         label: 'Need Peer IP' },
] as const;

type DepColumn = { key: string; label: string };

const FLAT_HEADERS = [
  'Sl#', 'Date', 'District', 'District Code',
  'Total', 'Online', 'Offline', 'Online %', 'Offline %',
  ...INTERNAL_COLUMNS.map(c => c.label), 'Internal Sum',
  ...EXTERNAL_COLUMNS.map(c => c.label), 'External Sum',
  'Dep. Sum', 'Submitted By', 'Submitted At',
] as const;

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDayStart(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}
function parseDayEnd(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999Z`);
  return isNaN(d.getTime()) ? null : d;
}
function formatDateOnlyIST(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value || '';
  const m = parts.find(p => p.type === 'month')?.value || '';
  const dy = parts.find(p => p.type === 'day')?.value || '';
  return `${y}-${m}-${dy}`;
}
function formatDateTimeIST(value: Date | string | null | undefined): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value));
}
function isWithinSelectedRangeIST(value: Date | string, from: string, to: string): boolean {
  const localDate = formatDateOnlyIST(value);
  return localDate >= from && localDate <= to;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildFlatRow(entry: any, index: number): unknown[] {
  return [
    index + 1,
    formatDateOnlyIST(entry.date),
    entry.district.name,
    entry.district.code,
    entry.totalCount,
    entry.onlineCount,
    entry.offlineCount,
    `${entry.onlinePct.toFixed(2)}%`,
    `${entry.offlinePct.toFixed(2)}%`,
    ...(INTERNAL_COLUMNS as readonly DepColumn[]).map(c => entry[c.key] ?? 0),
    entry.internalSum,
    ...(EXTERNAL_COLUMNS as readonly DepColumn[]).map(c => entry[c.key] ?? 0),
    entry.externalSum,
    entry.dependencySum,
    entry.createdBy?.name || '',
    formatDateTimeIST(entry.createdAt),
  ];
}

// ── Excel builder ─────────────────────────────────────────────────────────────

async function buildExcel(entries: any[], from: string, to: string): Promise<Uint8Array> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Matrix Smart Technologies';
  wb.created  = new Date();
  wb.modified = new Date();
  wb.subject  = 'Offline Dependencies Report';
  wb.title    = `Offline Dependencies ${from} to ${to}`;

  const ws = wb.addWorksheet('Report', {
    properties: { tabColor: { argb: 'FFD6A38A' } },
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  const N = FLAT_HEADERS.length; // 33 columns total

  // ── Cinematic palette (ARGB = AARRGGBB) ───────────────────────────────────
  const C = {
    titleBg:     'FF1F2A2E', // Dark Forest Green
    titleText:   'FFEDEAE6', // Cream
    infoBg:      'FF344A55', // Dark Slate
    infoText:    'FFD6A38A', // Peach
    groupBg:     'FF2B3A42', // Medium Dark
    groupText:   'FFD6A38A', // Peach
    intSecBg:    'FF5C3D28', // Warm Dark Brown
    intSecText:  'FFE8C4A8', // Light Peach
    extSecBg:    'FF1E3A50', // Cool Dark Blue
    extSecText:  'FF8FBFCF', // Light Blue
    hdrGenBg:    'FF344A55', // Slate
    hdrGenText:  'FFEDEAE6', // Cream
    hdrIntBg:    'FF6B4530', // Warm Header
    hdrIntText:  'FFEDEAE6', // Cream
    hdrExtBg:    'FF1E3A50', // Cool Header
    hdrExtText:  'FFEDEAE6', // Cream
    dataOddBg:   'FFF8F5F2', // Warm Near-White
    dataEvenBg:  'FFFFFFFF', // Pure White
    dataText:    'FF1F2A2E', // Dark
    offlineText: 'FFCC2B2B', // Red for offline values
    totalBg:     'FFFAEEE8', // Light Peach
    totalText:   'FF7C3A1E', // Dark Warm
    borderLight: 'FFD4CECA', // Warm Light Border
    borderDark:  'FF8B7A6E', // Medium Warm Border
  };

  const fill = (argb: string) =>
    ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
  const fnt = (argb: string, bold = false, size = 10, italic = false) =>
    ({ name: 'Calibri', color: { argb }, bold, size, italic });
  const brd = (argb: string, style: 'thin' | 'medium' = 'thin') =>
    ({ top: { style, color: { argb } }, bottom: { style, color: { argb } },
       left: { style, color: { argb } }, right: { style, color: { argb } } });
  const ctr: any = { horizontal: 'center', vertical: 'middle' };

  const applyBorderRange = (row: number, c1: number, c2: number, style: 'thin' | 'medium' = 'thin', argb = C.borderLight) => {
    for (let c = c1; c <= c2; c++) ws.getCell(row, c).border = brd(argb, style);
  };

  // ── ROW 1: Title ──────────────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, N);
  const t = ws.getCell(1, 1);
  t.value     = 'MATRIX SMART TECHNOLOGIES  ·  OFFLINE DEPENDENCIES REPORT';
  t.fill      = fill(C.titleBg);
  t.font      = fnt(C.titleText, true, 14);
  t.alignment = { ...ctr, wrapText: false };
  ws.getRow(1).height = 30;
  applyBorderRange(1, 1, N, 'medium', C.borderDark);

  // ── ROW 2: Period + Generated ─────────────────────────────────────────────
  const half = Math.floor(N / 2);
  ws.mergeCells(2, 1, 2, half);
  const p = ws.getCell(2, 1);
  p.value     = `  Period: ${from}  →  ${to}`;
  p.fill      = fill(C.infoBg);
  p.font      = fnt(C.infoText, false, 10, true);
  p.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(2, half + 1, 2, N);
  const g = ws.getCell(2, half + 1);
  g.value     = `Generated: ${formatDateTimeIST(new Date())}  `;
  g.fill      = fill(C.infoBg);
  g.font      = fnt(C.infoText, false, 10, true);
  g.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(2).height = 20;
  applyBorderRange(2, 1, N, 'medium', C.borderDark);

  // ── Group entries by date ─────────────────────────────────────────────────
  const grouped = new Map<string, any[]>();
  for (const e of entries) {
    const k = formatDateOnlyIST(e.date);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(e);
  }

  let r = 4; // data starts after title(1) + info(2) + spacer(3)

  for (const [dateKey, dayEntries] of Array.from(grouped)) {
    // ── Date group banner ─────────────────────────────────────────────────
    ws.mergeCells(r, 1, r, N);
    const gb = ws.getCell(r, 1);
    gb.value     = `  ◆  ${dateKey}  —  ${dayEntries.length} district${dayEntries.length !== 1 ? 's' : ''}`;
    gb.fill      = fill(C.groupBg);
    gb.font      = fnt(C.groupText, true, 11);
    gb.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(r).height = 22;
    applyBorderRange(r, 1, N, 'medium', C.borderDark);
    r++;

    // ── Category label row ────────────────────────────────────────────────
    // Fill all cells with general header bg
    for (let c = 1; c <= N; c++) {
      ws.getCell(r, c).fill = fill(C.hdrGenBg);
    }
    // Internal section: cols 10–21 (11 data + 1 sum)
    ws.mergeCells(r, 10, r, 21);
    const il = ws.getCell(r, 10);
    il.value     = '⚙  INTERNAL DEPENDENCIES';
    il.fill      = fill(C.intSecBg);
    il.font      = fnt(C.intSecText, true, 9);
    il.alignment = ctr;
    applyBorderRange(r, 10, 21, 'medium', C.borderDark);

    // External section: cols 22–30 (8 data + 1 sum)
    ws.mergeCells(r, 22, r, 30);
    const el = ws.getCell(r, 22);
    el.value     = '⚡  EXTERNAL DEPENDENCIES';
    el.fill      = fill(C.extSecBg);
    el.font      = fnt(C.extSecText, true, 9);
    el.alignment = ctr;
    applyBorderRange(r, 22, 30, 'medium', C.borderDark);
    applyBorderRange(r, 1, 9, 'thin', C.borderLight);
    applyBorderRange(r, 31, N, 'thin', C.borderLight);
    ws.getRow(r).height = 18;
    r++;

    // ── Column headers ────────────────────────────────────────────────────
    const hr = ws.getRow(r);
    hr.values    = FLAT_HEADERS as unknown as any[];
    hr.height    = 28;
    hr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for (let c = 1; c <= N; c++) {
      const cell = hr.getCell(c);
      if (c >= 10 && c <= 21) { cell.fill = fill(C.hdrIntBg); cell.font = fnt(C.hdrIntText, true, 8); }
      else if (c >= 22 && c <= 30) { cell.fill = fill(C.hdrExtBg); cell.font = fnt(C.hdrExtText, true, 8); }
      else { cell.fill = fill(C.hdrGenBg); cell.font = fnt(C.hdrGenText, true, 8); }
    }
    applyBorderRange(r, 1, N, 'medium', C.borderDark);
    r++;

    // ── Data rows ─────────────────────────────────────────────────────────
    dayEntries.forEach((entry: any, idx: number) => {
      const dr   = ws.getRow(r);
      dr.values  = buildFlatRow(entry, idx) as any[];
      dr.height  = 17;
      dr.alignment = { vertical: 'middle' };
      const bg = idx % 2 === 0 ? C.dataOddBg : C.dataEvenBg;
      for (let c = 1; c <= N; c++) {
        const cell = dr.getCell(c);
        cell.fill = fill(bg);
        // Column 7 = Offline count → red bold
        if (c === 7) {
          cell.font = { name: 'Calibri', color: { argb: C.offlineText }, bold: true, size: 10 };
        } else {
          cell.font = fnt(C.dataText, false, 10);
        }
      }
      applyBorderRange(r, 1, N, 'thin', C.borderLight);
      r++;
    });

    // ── Grand total row ───────────────────────────────────────────────────
    const tot = dayEntries.reduce(
      (acc: any, e: any) => {
        acc.totalCount  += e.totalCount;  acc.onlineCount += e.onlineCount;
        acc.offlineCount += e.offlineCount; acc.internalSum += e.internalSum;
        acc.externalSum += e.externalSum; acc.dependencySum += e.dependencySum;
        for (const c of INTERNAL_COLUMNS as readonly DepColumn[]) acc[c.key] += e[c.key] ?? 0;
        for (const c of EXTERNAL_COLUMNS as readonly DepColumn[]) acc[c.key] += e[c.key] ?? 0;
        return acc;
      },
      { totalCount:0, onlineCount:0, offlineCount:0, internalSum:0, externalSum:0, dependencySum:0,
        cat6Cable:0, threeCorepower:0, gponIssues:0, ofcIssues:0, cameraStoreReplacement:0,
        camerasFluctuating:0, needToCheck:0, fiberRequired:0, hydraLadder:0, mcbIssue:0,
        switch8portIssue:0, roadExtensionConstruction:0, noOlt:0, popDown:0, jbAccident:0,
        renovation:0, powerDisconnection:0, dgpOffice:0, needPeerIp:0 }
    );
    const onPct  = tot.totalCount ? (tot.onlineCount  / tot.totalCount * 100) : 0;
    const offPct = tot.totalCount ? (tot.offlineCount / tot.totalCount * 100) : 0;

    const tr = ws.getRow(r);
    tr.values = [
      '', dateKey, `TOTAL  (${dayEntries.length} districts)`, '',
      tot.totalCount, tot.onlineCount, tot.offlineCount,
      `${onPct.toFixed(2)}%`, `${offPct.toFixed(2)}%`,
      ...(INTERNAL_COLUMNS as readonly DepColumn[]).map(c => tot[c.key]),
      tot.internalSum,
      ...(EXTERNAL_COLUMNS as readonly DepColumn[]).map(c => tot[c.key]),
      tot.externalSum, tot.dependencySum, '', '',
    ] as any[];
    tr.height    = 20;
    tr.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= N; c++) {
      tr.getCell(c).fill = fill(C.totalBg);
      tr.getCell(c).font = fnt(C.totalText, true, 10);
    }
    applyBorderRange(r, 1, N, 'medium', C.borderDark);
    r += 2; // one blank spacer between groups
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  ws.columns = [
    { width: 6  }, // Sl#
    { width: 13 }, // Date
    { width: 24 }, // District
    { width: 12 }, // Code
    { width: 10 }, // Total
    { width: 9  }, // Online
    { width: 9  }, // Offline
    { width: 10 }, // Online%
    { width: 10 }, // Offline%
    ...Array.from({ length: INTERNAL_COLUMNS.length }, () => ({ width: 13 })), // 10-20
    { width: 12 }, // Internal Sum (21)
    ...Array.from({ length: EXTERNAL_COLUMNS.length }, () => ({ width: 14 })), // 22-29
    { width: 12 }, // External Sum (30)
    { width: 12 }, // Dep Sum (31)
    { width: 20 }, // Submitted By (32)
    { width: 22 }, // Submitted At (33)
  ];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer) as unknown as Uint8Array;
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromRaw    = searchParams.get('from');
  const toRaw      = searchParams.get('to');
  const districtId = searchParams.get('districtId');
  const fmt        = (searchParams.get('format') || 'xlsx').toLowerCase();

  const fromDate = parseDayStart(fromRaw);
  const toDate   = parseDayEnd(toRaw);

  if (!fromDate || !toDate) {
    return NextResponse.json({ success: false, error: 'Valid from and to dates are required' }, { status: 400 });
  }
  if (fromDate > toDate) {
    return NextResponse.json({ success: false, error: 'From date cannot be greater than To date' }, { status: 400 });
  }

  const where: Record<string, unknown> = { date: { gte: fromDate, lte: toDate } };
  if (districtId) where.districtId = districtId;

  if (user.role === 'FIELD_USER') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { districtIdsJson: true, districtId: true },
    });
    let distIds: string[] = [];
    try { distIds = JSON.parse(dbUser?.districtIdsJson || '[]'); } catch {}
    if (!distIds.length && dbUser?.districtId) distIds = [dbUser.districtId];
    if (distIds.length) where.districtId = { in: distIds };
  }

  const entries = await prisma.dailyEntry.findMany({
    where,
    include: {
      district: { select: { name: true, code: true, sortOrder: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ date: 'asc' }, { district: { sortOrder: 'asc' } }],
  });

  const safeFrom = fromRaw || formatDateOnlyIST(fromDate);
  const safeTo   = toRaw   || formatDateOnlyIST(toDate);
  const filtered = entries.filter(e => isWithinSelectedRangeIST(e.date, safeFrom, safeTo));

  if (fmt === 'json') {
    return NextResponse.json({ success: true, data: filtered, total: filtered.length });
  }

  if (fmt === 'csv') {
    const csv = [
      FLAT_HEADERS.join(','),
      ...filtered.map((e, i) => buildFlatRow(e, i).map(escapeCsv).join(',')),
    ].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="offline-dependencies-${safeFrom}-to-${safeTo}.csv"`,
      },
    });
  }

  const xlsx = await buildExcel(filtered, safeFrom, safeTo);
  return new NextResponse(xlsx as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="offline-dependencies-${safeFrom}-to-${safeTo}.xlsx"`,
    },
  });
}
