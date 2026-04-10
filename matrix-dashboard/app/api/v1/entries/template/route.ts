import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/guards';
import { TEMPLATE_HEADERS, escapeCsv } from '../../../../../lib/utils/offlineDependencyFile';

const EXAMPLE_ROW = [
  '2026-03-25',
  'VZM',
  'Visakhapatnam',
  2003,
  1690,
  313,
  '',
  '',
  21,
  4,
  5,
  134,
  2,
  28,
  0,
  0,
  0,
  0,
  10,
  45,
  26,
  3,
  0,
  35,
  0,
  1,
  '',
  '',
] as const;

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const format = (new URL(req.url).searchParams.get('format') || 'xlsx').toLowerCase();
  const districts = await prisma.district.findMany({ orderBy: { sortOrder: 'asc' } });

  if (format === 'csv') {
    const lines = [
      '# Fill one row per district per date. Online + Offline must equal Total Count. Dependency totals must equal Offline.',
      TEMPLATE_HEADERS.join(','),
      EXAMPLE_ROW.map(escapeCsv).join(','),
    ];

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="offline-dependencies-template.csv"',
      },
    });
  }

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Matrix Smart Technologies';
  workbook.created = new Date();

  const instructions = workbook.addWorksheet('Instructions');
  instructions.columns = [{ width: 120 }];

  [
    'Offline Dependencies Upload Template',
    '1. Enter one row for each District + Date combination.',
    '2. Date format should be YYYY-MM-DD.',
    '3. District Code is recommended. District name also works.',
    '4. Online + Offline must equal Total Count.',
    '5. Sum of all dependency columns must equal Offline.',
    '6. Online %, Offline %, Internal Sum, External Sum, and Dependency Sum are optional. They will be recalculated during upload.',
    '7. Existing Date + District entries are skipped to avoid duplicate records.',
  ].forEach((text, index) => {
    instructions.getCell(index + 1, 1).value = text;
  });

  instructions.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0F4C81' } };

  const dataSheet = workbook.addWorksheet('Historical Data', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  dataSheet.addRow(TEMPLATE_HEADERS as unknown as any[]);
  dataSheet.addRow(EXAMPLE_ROW as unknown as any[]);
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  dataSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  dataSheet.columns = TEMPLATE_HEADERS.map((header) => ({ width: Math.max(header.length + 4, 14) }));

  const districtSheet = workbook.addWorksheet('District Master', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  districtSheet.addRow(['Sort Order', 'District Code', 'District Name']);
  districts.forEach((district) => districtSheet.addRow([district.sortOrder, district.code, district.name]));
  districtSheet.getRow(1).font = { bold: true };
  districtSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  districtSheet.columns = [
    { width: 12 },
    { width: 16 },
    { width: 24 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="offline-dependencies-template.xlsx"',
    },
  });
}