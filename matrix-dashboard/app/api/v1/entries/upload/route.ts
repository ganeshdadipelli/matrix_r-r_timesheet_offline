import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';
import { pct } from '@/lib/utils/calculations';

function parseNum(v: string | undefined): number {
  const normalized = (v || '').replace(/,/g, '').trim();
  if (!normalized) return 0;
  const n = parseInt(normalized, 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

function parseDateValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime())
    ? null
    : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getTodayStartIST(): Date {
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return new Date(`${today}T00:00:00.000Z`);
}

type UploadRow = {
  date: string;
  districtCode: string;
  districtName: string;
  totalCount: string;
  onlineCount: string;
  offlineCount: string;
  cat6Cable: string;
  threeCorepower: string;
  gponIssues: string;
  ofcIssues: string;
  cameraStoreReplacement: string;
  camerasFluctuating: string;
  needToCheck: string;
  fiberRequired: string;
  hydraLadder: string;
  mcbIssue: string;
  switch8portIssue: string;
  roadExtensionConstruction: string;
  noOlt: string;
  popDown: string;
  jbAccident: string;
  renovation: string;
  powerDisconnection: string;
  dgpOffice: string;
  needPeerIp: string;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[%#]/g, '')
    .replace(/[._/()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date'],
  districtCode: ['district code', 'districtcode', 'code'],
  districtName: ['district', 'district name', 'districtname'],
  totalCount: ['total count', 'total', 'total cameras'],
  onlineCount: ['online'],
  offlineCount: ['offline'],
  cat6Cable: ['cat6 cable', 'cat6'],
  threeCorepower: ['3-core power', '3 core power', '3-core power cable', '3core power'],
  gponIssues: ['gpon issues', 'gpon'],
  ofcIssues: ['ofc issues', 'ofc'],
  cameraStoreReplacement: [
    'camera store/repl',
    'cam store/repl',
    'camera store/replacement',
    'cam store replacement',
    'camera store replacement',
  ],
  camerasFluctuating: ['cameras fluctuating', 'cam fluctuating', 'camera fluctuating'],
  needToCheck: ['need to check', 'need check', 'needtocheck'],
  fiberRequired: ['fiber required', 'fibre required', 'fiber'],
  hydraLadder: ['hydra ladder', 'hydra'],
  mcbIssue: ['mcb issue', 'mcb'],
  switch8portIssue: ['8-port switch issue', '8-port switch', '8 port switch issue', '8 port switch'],
  roadExtensionConstruction: ['road extension/construction', 'road extension', 'road construction'],
  noOlt: ['no olt', 'noolt'],
  popDown: ['pop down', 'popdown'],
  jbAccident: ['jb accident', 'jbaccident'],
  renovation: ['renovation'],
  powerDisconnection: ['power disconnection', 'power disconnections', 'power disc.', 'power disc'],
  dgpOffice: ['d.g.p office', 'dgp office', 'd.g.p. office'],
  needPeerIp: ['need peer ip', 'peer ip'],
};

function buildHeaderIndex(values: string[]): Record<string, number> | null {
  const normalized = values.map(normalizeHeader);

  const hasDate = normalized.includes('date');
  const hasDistrict = normalized.includes('district') || normalized.includes('district code');
  const hasTotal = normalized.includes('total count') || normalized.includes('total');
  const hasOnline = normalized.includes('online');
  const hasOffline = normalized.includes('offline');

  if (!(hasDate && hasDistrict && hasTotal && hasOnline && hasOffline)) return null;

  const headerIndex: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = normalized.findIndex((value) => aliases.includes(value));
    if (index >= 0) headerIndex[field] = index;
  }

  return headerIndex;
}

function rowFromValues(values: string[], headerIndex: Record<string, number>): UploadRow {
  const get = (field: keyof UploadRow): string => {
    const index = headerIndex[field];
    if (index === undefined || index < 0) return '';
    return (values[index] || '').trim();
  };

  return {
    date: get('date'),
    districtCode: get('districtCode'),
    districtName: get('districtName'),
    totalCount: get('totalCount'),
    onlineCount: get('onlineCount'),
    offlineCount: get('offlineCount'),
    cat6Cable: get('cat6Cable'),
    threeCorepower: get('threeCorepower'),
    gponIssues: get('gponIssues'),
    ofcIssues: get('ofcIssues'),
    cameraStoreReplacement: get('cameraStoreReplacement'),
    camerasFluctuating: get('camerasFluctuating'),
    needToCheck: get('needToCheck'),
    fiberRequired: get('fiberRequired'),
    hydraLadder: get('hydraLadder'),
    mcbIssue: get('mcbIssue'),
    switch8portIssue: get('switch8portIssue'),
    roadExtensionConstruction: get('roadExtensionConstruction'),
    noOlt: get('noOlt'),
    popDown: get('popDown'),
    jbAccident: get('jbAccident'),
    renovation: get('renovation'),
    powerDisconnection: get('powerDisconnection'),
    dgpOffice: get('dgpOffice'),
    needPeerIp: get('needPeerIp'),
  };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Only Admin or Super Admin can upload' },
      { status: 403 }
    );
  }

  const todayStart = getTodayStartIST();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isExcel = name.endsWith('.xlsx');
    const isCsv   = name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      return NextResponse.json({ success: false, error: 'Only CSV (.csv) or Excel (.xlsx) files are accepted' }, { status: 400 });
    }

    // Build a list of string-array rows depending on file type
    let rawRows: string[][] = [];

    if (isExcel) {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      const arrayBuf = await file.arrayBuffer();
      await wb.xlsx.load(Buffer.from(arrayBuf) as any);
      const sheet = wb.worksheets[0];
      if (!sheet) {
        return NextResponse.json({ success: false, error: 'Excel file has no worksheets' }, { status: 400 });
      }
      sheet.eachRow((row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          // Fill any column gap with empty strings
          while (cells.length < colNum - 1) cells.push('');
          const v = cell.value;
          let s = '';
          if (v === null || v === undefined) {
            s = '';
          } else if (v instanceof Date) {
            const y = v.getFullYear();
            const m = String(v.getMonth() + 1).padStart(2, '0');
            const d = String(v.getDate()).padStart(2, '0');
            s = `${y}-${m}-${d}`;
          } else if (typeof v === 'object') {
            if ('result' in v) {
              const res = (v as any).result;
              s = res instanceof Date
                ? `${res.getFullYear()}-${String(res.getMonth()+1).padStart(2,'0')}-${String(res.getDate()).padStart(2,'0')}`
                : String(res ?? '').trim();
            } else if ('richText' in v) {
              s = ((v as any).richText as any[]).map((r: any) => r.text || '').join('').trim();
            } else if ('error' in v) {
              s = '';
            } else {
              s = String(v).trim();
            }
          } else {
            s = String(v).trim();
          }
          cells.push(s);
        });
        rawRows.push(cells);
      });
    } else {
      // CSV path
      const text = await file.text();
      const lines = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter(Boolean);
      rawRows = lines
        .filter(l => !l.trim().startsWith('#'))
        .map(l => splitCsvLine(l));
    }

    if (rawRows.length < 2) {
      return NextResponse.json({ success: false, error: 'File is empty or has only a header row' }, { status: 400 });
    }

    let headerIndex: Record<string, number> | null = null;
    const parsedRows: UploadRow[] = [];

    for (const values of rawRows) {
      if (!values.some(v => v.trim())) continue; // skip blank rows

      const nextHeader = buildHeaderIndex(values);
      if (nextHeader) {
        headerIndex = nextHeader;
        continue;
      }

      if (!headerIndex) continue;

      const row = rowFromValues(values, headerIndex);
      if (!Object.values(row).some(Boolean)) continue;
      parsedRows.push(row);
    }

    if (!headerIndex || !parsedRows.length) {
      return NextResponse.json(
        { success: false, error: `Could not find valid upload rows in the ${isExcel ? 'Excel' : 'CSV'} file` },
        { status: 400 }
      );
    }

    const districts = await prisma.district.findMany();
    const districtByCode: Record<string, string> = {};
    const districtByName: Record<string, string> = {};

    for (const d of districts) {
      districtByCode[d.code.toUpperCase()] = d.id;
      districtByName[d.name.toLowerCase()] = d.id;
    }

    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];

      try {
        const date = parseDateValue(row.date);
        if (!date) {
          results.errors.push(`Row ${i + 2}: Invalid date "${row.date}"`);
          results.skipped++;
          continue;
        }

        if (date > todayStart) {
          results.errors.push(`Row ${i + 2}: Future date "${row.date}" is not allowed`);
          results.skipped++;
          continue;
        }

        const districtKey = row.districtCode?.trim() || row.districtName?.trim();

        const districtId =
          districtByCode[(row.districtCode || '').trim().toUpperCase()] ||
          districtByName[(row.districtName || '').trim().toLowerCase()];

        if (!districtId) {
          results.errors.push(`Row ${i + 2}: Unknown district "${districtKey}"`);
          results.skipped++;
          continue;
        }

        const totalCount = parseNum(row.totalCount);
        const onlineCount = parseNum(row.onlineCount);
        const offlineCount = parseNum(row.offlineCount);

        if (onlineCount + offlineCount !== totalCount) {
          results.errors.push(
            `Row ${i + 2}: Online + Offline (${onlineCount}+${offlineCount}) ≠ Total (${totalCount})`
          );
          results.skipped++;
          continue;
        }

        const cat6Cable = parseNum(row.cat6Cable);
        const threeCorepower = parseNum(row.threeCorepower);
        const gponIssues = parseNum(row.gponIssues);
        const ofcIssues = parseNum(row.ofcIssues);
        const cameraStoreReplacement = parseNum(row.cameraStoreReplacement);
        const camerasFluctuating = parseNum(row.camerasFluctuating);
        const needToCheck = parseNum(row.needToCheck);
        const fiberRequired = parseNum(row.fiberRequired);
        const hydraLadder = parseNum(row.hydraLadder);
        const mcbIssue = parseNum(row.mcbIssue);
        const switch8portIssue = parseNum(row.switch8portIssue);
        const roadExt = parseNum(row.roadExtensionConstruction);
        const noOlt = parseNum(row.noOlt);
        const popDown = parseNum(row.popDown);
        const jbAccident = parseNum(row.jbAccident);
        const renovation = parseNum(row.renovation);
        const powerDisconnection = parseNum(row.powerDisconnection);
        const dgpOffice = parseNum(row.dgpOffice);
        const needPeerIp = parseNum(row.needPeerIp);

        const internalSum =
          cat6Cable +
          threeCorepower +
          gponIssues +
          ofcIssues +
          cameraStoreReplacement +
          camerasFluctuating +
          needToCheck +
          fiberRequired +
          hydraLadder +
          mcbIssue +
          switch8portIssue;

        const externalSum =
          roadExt +
          noOlt +
          popDown +
          jbAccident +
          renovation +
          powerDisconnection +
          dgpOffice +
          needPeerIp;

        const dependencySum = internalSum + externalSum;

        if (dependencySum !== offlineCount) {
          results.errors.push(
            `Row ${i + 2}: Dependency sum (${dependencySum}) ≠ Offline count (${offlineCount})`
          );
          results.skipped++;
          continue;
        }

        const existing = await prisma.dailyEntry.findUnique({
          where: { date_districtId: { date, districtId } },
        });

        if (existing) {
          results.errors.push(
            `Row ${i + 2}: Entry already exists for ${districtKey} on ${row.date} — skipped`
          );
          results.skipped++;
          continue;
        }

        await prisma.dailyEntry.create({
          data: {
            date,
            districtId,
            totalCount,
            onlineCount,
            offlineCount,
            onlinePct: pct(onlineCount, totalCount),
            offlinePct: pct(offlineCount, totalCount),
            cat6Cable,
            threeCorepower,
            gponIssues,
            ofcIssues,
            cameraStoreReplacement,
            camerasFluctuating,
            needToCheck,
            fiberRequired,
            hydraLadder,
            mcbIssue,
            switch8portIssue,
            roadExtensionConstruction: roadExt,
            noOlt,
            popDown,
            jbAccident,
            renovation,
            powerDisconnection,
            dgpOffice,
            needPeerIp,
            internalSum,
            externalSum,
            dependencySum,
            isValidated: true,
            isLocked: true,
            lockedAt: new Date(),
            createdById: user.userId,
          },
        });

        results.inserted++;
      } catch (rowErr: any) {
        results.errors.push(`Row ${i + 2}: ${rowErr.message}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Upload complete: ${results.inserted} inserted, ${results.skipped} skipped`,
      data: results,
    });
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json(
      { success: false, error: 'Upload failed — check file format' },
      { status: 500 }
    );
  }
}