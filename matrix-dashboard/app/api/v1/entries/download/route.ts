import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

const INTERNAL_COLUMNS = [
  { key: 'cat6Cable', label: 'CAT6 Cable' },
  { key: 'threeCorepower', label: '3-Core Power' },
  { key: 'gponIssues', label: 'GPON Issues' },
  { key: 'ofcIssues', label: 'OFC Issues' },
  { key: 'cameraStoreReplacement', label: 'Cam Store/Repl' },
  { key: 'camerasFluctuating', label: 'Cam Fluctuating' },
  { key: 'needToCheck', label: 'Need to Check' },
  { key: 'fiberRequired', label: 'Fiber Required' },
  { key: 'hydraLadder', label: 'Hydra Ladder' },
  { key: 'mcbIssue', label: 'MCB Issue' },
  { key: 'switch8portIssue', label: '8-Port Switch' },
] as const;

const EXTERNAL_COLUMNS = [
  { key: 'roadExtensionConstruction', label: 'Road Extension' },
  { key: 'noOlt', label: 'No OLT' },
  { key: 'popDown', label: 'Pop Down' },
  { key: 'jbAccident', label: 'JB Accident' },
  { key: 'renovation', label: 'Renovation' },
  { key: 'powerDisconnection', label: 'Power Disconnection' },
  { key: 'dgpOffice', label: 'DGP Office' },
  { key: 'needPeerIp', label: 'Need Peer IP' },
] as const;

type DepColumn = {
  key: string;
  label: string;
};

const FLAT_HEADERS = [
  'Sl#',
  'Date',
  'District',
  'District Code',
  'Total Count',
  'Online',
  'Offline',
  'Online %',
  'Offline %',
  ...INTERNAL_COLUMNS.map((column) => column.label),
  'Internal Sum',
  ...EXTERNAL_COLUMNS.map((column) => column.label),
  'External Sum',
  'Dependency Sum',
  'Submitted By',
  'Submitted At',
] as const;

function parseDayStart(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDayEnd(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnlyIST(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}

function formatDateTimeIST(value: Date | string | null | undefined): string {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function isWithinSelectedRangeIST(
  value: Date | string,
  from: string,
  to: string
): boolean {
  const localDate = formatDateOnlyIST(value);
  return localDate >= from && localDate <= to;
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildFlatRow(entry: any, index: number) {
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
    ...(INTERNAL_COLUMNS as readonly DepColumn[]).map((column: DepColumn) => entry[column.key] ?? 0),
    entry.internalSum,
    ...(EXTERNAL_COLUMNS as readonly DepColumn[]).map((column: DepColumn) => entry[column.key] ?? 0),
    entry.externalSum,
    entry.dependencySum,
    entry.createdBy?.name || '',
    formatDateTimeIST(entry.createdAt),
  ];
}

async function buildExcel(entries: any[], from: string, to: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Matrix Smart Technologies';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = 'Offline Dependencies Report';
  workbook.title = `Offline Dependencies ${from} to ${to}`;

  const worksheet = workbook.addWorksheet('Offline Dependencies', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const totalColumns = FLAT_HEADERS.length;
  const rightMostColumn = totalColumns;

  worksheet.mergeCells(1, 1, 1, rightMostColumn);
  worksheet.getCell(1, 1).value = 'OFFLINE DEPENDENCIES REPORT';
  worksheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FF0F4C81' } };
  worksheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(2, 1, 2, rightMostColumn);
  worksheet.getCell(2, 1).value = `Period: ${from} to ${to}`;
  worksheet.getCell(2, 1).font = { italic: true, color: { argb: 'FF475569' } };
  worksheet.getCell(2, 1).alignment = { horizontal: 'center' };

  worksheet.mergeCells(3, 1, 3, rightMostColumn);
  worksheet.getCell(3, 1).value = `Generated on: ${formatDateTimeIST(new Date())}`;
  worksheet.getCell(3, 1).font = { size: 10, color: { argb: 'FF64748B' } };
  worksheet.getCell(3, 1).alignment = { horizontal: 'center' };

  let currentRow = 5;
  const grouped = new Map<string, any[]>();

  for (const entry of entries) {
    const key = formatDateOnlyIST(entry.date);
    const list = grouped.get(key) || [];
    list.push(entry);
    grouped.set(key, list);
  }

  const generalHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } as const;
  const internalHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } } as const;
  const externalHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } } as const;
  const groupFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } } as const;

  const applyBorder = (rowNumber: number, fromColumn = 1, toColumn = totalColumns) => {
    for (let column = fromColumn; column <= toColumn; column++) {
      worksheet.getCell(rowNumber, column).border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    }
  };

  for (const [dateKey, dayEntries] of Array.from(grouped.entries()) as Array<[string, any[]]>) {
    worksheet.mergeCells(currentRow, 1, currentRow, rightMostColumn);
    worksheet.getCell(currentRow, 1).value = `OFFLINE DEPENDENCIES - FIELD DATA (${dateKey})`;
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 12, color: { argb: 'FF7C2D12' } };
    worksheet.getCell(currentRow, 1).fill = groupFill;
    worksheet.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 1;

    worksheet.mergeCells(currentRow, 10, currentRow, 20);
    worksheet.getCell(currentRow, 10).value = 'Internal Dependencies';
    worksheet.getCell(currentRow, 10).alignment = { horizontal: 'center' };
    worksheet.getCell(currentRow, 10).font = { bold: true, color: { argb: 'FF9A3412' } };
    worksheet.getCell(currentRow, 10).fill = internalHeaderFill;

    worksheet.mergeCells(currentRow, 22, currentRow, 29);
    worksheet.getCell(currentRow, 22).value = 'External Dependencies';
    worksheet.getCell(currentRow, 22).alignment = { horizontal: 'center' };
    worksheet.getCell(currentRow, 22).font = { bold: true, color: { argb: 'FF0F766E' } };
    worksheet.getCell(currentRow, 22).fill = externalHeaderFill;

    applyBorder(currentRow, 10, 20);
    applyBorder(currentRow, 22, 29);
    currentRow += 1;

    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = FLAT_HEADERS as unknown as any[];
    headerRow.font = { bold: true, color: { argb: 'FF111827' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 28;

    for (let column = 1; column <= totalColumns; column++) {
      const cell = headerRow.getCell(column);
      if (column >= 10 && column <= 21) cell.fill = internalHeaderFill;
      else if (column >= 22 && column <= 30) cell.fill = externalHeaderFill;
      else cell.fill = generalHeaderFill;
    }

    applyBorder(currentRow);
    currentRow += 1;

    dayEntries.forEach((entry: any, index: number) => {
      const row = worksheet.getRow(currentRow);
      row.values = buildFlatRow(entry, index) as any[];
      row.alignment = { vertical: 'middle' };
      applyBorder(currentRow);
      currentRow += 1;
    });

    const totals = dayEntries.reduce(
      (acc: any, entry: any) => {
        acc.totalCount += entry.totalCount;
        acc.onlineCount += entry.onlineCount;
        acc.offlineCount += entry.offlineCount;
        acc.internalSum += entry.internalSum;
        acc.externalSum += entry.externalSum;
        acc.dependencySum += entry.dependencySum;

        for (const column of INTERNAL_COLUMNS as readonly DepColumn[]) acc[column.key] += entry[column.key] ?? 0;
        for (const column of EXTERNAL_COLUMNS as readonly DepColumn[]) acc[column.key] += entry[column.key] ?? 0;

        return acc;
      },
      {
        totalCount: 0,
        onlineCount: 0,
        offlineCount: 0,
        internalSum: 0,
        externalSum: 0,
        dependencySum: 0,
        cat6Cable: 0,
        threeCorepower: 0,
        gponIssues: 0,
        ofcIssues: 0,
        cameraStoreReplacement: 0,
        camerasFluctuating: 0,
        needToCheck: 0,
        fiberRequired: 0,
        hydraLadder: 0,
        mcbIssue: 0,
        switch8portIssue: 0,
        roadExtensionConstruction: 0,
        noOlt: 0,
        popDown: 0,
        jbAccident: 0,
        renovation: 0,
        powerDisconnection: 0,
        dgpOffice: 0,
        needPeerIp: 0,
      }
    );

    const onlinePct = totals.totalCount ? (totals.onlineCount / totals.totalCount) * 100 : 0;
    const offlinePct = totals.totalCount ? (totals.offlineCount / totals.totalCount) * 100 : 0;

    const grandTotalRow = worksheet.getRow(currentRow);
    grandTotalRow.values = [
      '',
      dateKey,
      'Grand Total',
      '',
      totals.totalCount,
      totals.onlineCount,
      totals.offlineCount,
      `${onlinePct.toFixed(2)}%`,
      `${offlinePct.toFixed(2)}%`,
      ...(INTERNAL_COLUMNS as readonly DepColumn[]).map((column: DepColumn) => totals[column.key]),
      totals.internalSum,
      ...(EXTERNAL_COLUMNS as readonly DepColumn[]).map((column: DepColumn) => totals[column.key]),
      totals.externalSum,
      totals.dependencySum,
      '',
      '',
    ] as any[];

    grandTotalRow.font = { bold: true, color: { argb: 'FF7C2D12' } };

    for (let column = 1; column <= totalColumns; column++) {
      grandTotalRow.getCell(column).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFED7AA' },
      };
    }

    applyBorder(currentRow);
    currentRow += 2;
  }

  worksheet.columns = [
    { width: 7 },
    { width: 14 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    ...Array.from({ length: INTERNAL_COLUMNS.length }, () => ({ width: 14 })),
    { width: 12 },
    ...Array.from({ length: EXTERNAL_COLUMNS.length }, () => ({ width: 16 })),
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 22 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');
  const districtId = searchParams.get('districtId');
  const format = (searchParams.get('format') || 'xlsx').toLowerCase();

  const fromDate = parseDayStart(fromRaw);
  const toDate = parseDayEnd(toRaw);

  if (!fromDate || !toDate) {
    return NextResponse.json(
      { success: false, error: 'Valid from and to dates are required' },
      { status: 400 }
    );
  }

  if (fromDate > toDate) {
    return NextResponse.json(
      { success: false, error: 'From date cannot be greater than To date' },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = {
    date: { gte: fromDate, lte: toDate },
  };

  if (districtId) where.districtId = districtId;

  if (user.role === 'FIELD_USER' && user.districtId) {
    where.districtId = user.districtId;
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
  const safeTo = toRaw || formatDateOnlyIST(toDate);

  const filteredEntries = entries.filter((entry) =>
    isWithinSelectedRangeIST(entry.date, safeFrom, safeTo)
  );

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      data: filteredEntries,
      total: filteredEntries.length,
    });
  }

  if (format === 'csv') {
    const csvRows = [
      FLAT_HEADERS.join(','),
      ...filteredEntries.map((entry, index) =>
        buildFlatRow(entry, index).map(escapeCsv).join(',')
      ),
    ];

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="offline-dependencies-${safeFrom}-to-${safeTo}.csv"`,
      },
    });
  }

  const xlsx = await buildExcel(filteredEntries, safeFrom, safeTo);

  return new NextResponse(xlsx, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="offline-dependencies-${safeFrom}-to-${safeTo}.xlsx"`,
    },
  });
}