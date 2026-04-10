import { format } from 'date-fns';

export const INTERNAL_COLUMNS = [
  { key: 'cat6Cable', label: 'CAT6 Cable' },
  { key: 'threeCorepower', label: '3-Core Power' },
  { key: 'gponIssues', label: 'GPON Issues' },
  { key: 'ofcIssues', label: 'OFC Issues' },
  { key: 'cameraStoreReplacement', label: 'Camera Store/Repl' },
  { key: 'camerasFluctuating', label: 'Cameras Fluctuating' },
  { key: 'needToCheck', label: 'Need to Check' },
  { key: 'fiberRequired', label: 'Fiber Required' },
  { key: 'hydraLadder', label: 'Hydra Ladder' },
  { key: 'mcbIssue', label: 'MCB Issue' },
  { key: 'switch8portIssue', label: '8-Port Switch Issue' },
] as const;

export const EXTERNAL_COLUMNS = [
  { key: 'roadExtensionConstruction', label: 'Road Extension/Construction' },
  { key: 'noOlt', label: 'No OLT' },
  { key: 'popDown', label: 'Pop Down' },
  { key: 'jbAccident', label: 'JB Accident' },
  { key: 'renovation', label: 'Renovation' },
  { key: 'powerDisconnection', label: 'Power Disconnection' },
  { key: 'dgpOffice', label: 'D.G.P Office' },
  { key: 'needPeerIp', label: 'Need Peer IP' },
] as const;

export const FLAT_HEADERS = [
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

export const TEMPLATE_HEADERS = [
  'Date',
  'District Code',
  'District',
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
] as const;

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
  internalSum: ['internal sum', 'internal total'],
  roadExtensionConstruction: ['road extension/construction', 'road extension', 'road construction'],
  noOlt: ['no olt', 'noolt'],
  popDown: ['pop down', 'popdown'],
  jbAccident: ['jb accident', 'jbaccident'],
  renovation: ['renovation'],
  powerDisconnection: ['power disconnection', 'power disconnections', 'power disc.', 'power disc'],
  dgpOffice: ['d.g.p office', 'dgp office', 'd.g.p. office'],
  needPeerIp: ['need peer ip', 'peer ip'],
  externalSum: ['external sum', 'external total'],
  dependencySum: ['dependency sum', 'grand dependency sum', 'total dependency'],
  submittedBy: ['submitted by', 'created by'],
  submittedAt: ['submitted at', 'created at'],
};

export type UploadRow = {
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

export type UploadParseResult = {
  rows: UploadRow[];
  headerFound: boolean;
};

export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[%#]/g, '')
    .replace(/[._/()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stringifyCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return format(value, 'yyyy-MM-dd');

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value).trim();
  }

  if (typeof value === 'object') {
    const cell = value as Record<string, any>;

    if (typeof cell.text === 'string') return cell.text.trim();

    if (typeof cell.result === 'string' || typeof cell.result === 'number') {
      return String(cell.result).trim();
    }

    if (Array.isArray(cell.richText)) {
      return cell.richText.map((part: any) => part?.text || '').join('').trim();
    }
  }

  return String(value).trim();
}

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

function looksLikeHeader(values: string[]): boolean {
  const normalized = values.map(normalizeHeader);
  const hasDate = normalized.includes('date');
  const hasDistrict = normalized.includes('district') || normalized.includes('district code');
  const hasTotal = normalized.includes('total count') || normalized.includes('total');
  const hasOnline = normalized.includes('online');
  const hasOffline = normalized.includes('offline');
  return hasDate && hasDistrict && hasTotal && hasOnline && hasOffline;
}

function buildHeaderIndex(values: string[]): Record<string, number> | null {
  if (!looksLikeHeader(values)) return null;

  const normalized = values.map(normalizeHeader);
  const headerIndex: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = normalized.findIndex((value) => aliases.includes(value));
    if (index >= 0) headerIndex[field] = index;
  }

  return headerIndex;
}

function shouldSkipRow(values: string[]): boolean {
  const normalized = values.map((value) => normalizeHeader(value)).filter(Boolean);
  if (!normalized.length) return true;

  const first = normalized[0];
  if (
    first.startsWith('offline dependencies') ||
    first.startsWith('grand total') ||
    first.startsWith('generated on') ||
    first.startsWith('report period') ||
    first.startsWith('period') ||
    first.startsWith('district master') ||
    first.startsWith('upload template') ||
    first.startsWith('instructions') ||
    normalized.includes('internal dependencies') ||
    normalized.includes('external dependencies')
  ) {
    return true;
  }

  return false;
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

export function parseCsvUpload(text: string): UploadParseResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() && !line.trim().startsWith('#'));

  const rows: UploadRow[] = [];
  let headerFound = false;
  let headerIndex: Record<string, number> | null = null;

  for (const line of lines) {
    const values = splitCsvLine(line);
    const nextHeader = buildHeaderIndex(values);

    if (nextHeader) {
      headerIndex = nextHeader;
      headerFound = true;
      continue;
    }

    if (!headerIndex || shouldSkipRow(values)) continue;

    const row = rowFromValues(values, headerIndex);
    if (!Object.values(row).some(Boolean)) continue;
    rows.push(row);
  }

  return { rows, headerFound };
}

export async function parseExcelUpload(
  fileData: ArrayBuffer | Uint8Array
): Promise<UploadParseResult> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const input =
    fileData instanceof Uint8Array ? fileData : Buffer.from(fileData);

  await workbook.xlsx.load(input as any);

  const rows: UploadRow[] = [];
  let headerFound = false;

  for (const worksheet of workbook.worksheets) {
    if (!worksheet.rowCount) continue;

    let headerIndex: Record<string, number> | null = null;

    worksheet.eachRow({ includeEmpty: false }, (row: any) => {
      const cellCount = Math.max(row.actualCellCount || 0, row.cellCount || 0);

      const values = Array.from({ length: cellCount }, (_, index) =>
        stringifyCellValue(row.getCell(index + 1).value)
      );

      const nextHeader = buildHeaderIndex(values);

      if (nextHeader) {
        headerIndex = nextHeader;
        headerFound = true;
        return;
      }

      if (!headerIndex || shouldSkipRow(values)) return;

      const parsed = rowFromValues(values, headerIndex);
      if (!Object.values(parsed).some(Boolean)) return;
      rows.push(parsed);
    });
  }

  return { rows, headerFound };
}

export function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toIsoDateOnly(value: Date | string): string {
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