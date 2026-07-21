/**
 * FILE: src/lib/exportUtils.ts
 * PASTE AT: src/lib/exportUtils.ts
 *
 * Shared PDF + Excel export utility used by every module.
 * Build this once — import from any component.
 *
 * DEPENDENCIES (already in most Vite+React projects, install if missing):
 *   npm install jspdf jspdf-autotable xlsx
 *
 * USAGE EXAMPLES:
 * ──────────────────────────────────────────────────────────
 *   import { exportTableToCsv, exportTableToExcel, exportReportToPdf } from '@/lib/exportUtils';
 *
 *   // CSV (no deps needed — pure browser):
 *   exportTableToCsv(rows, columns, 'incident-report-2024');
 *
 *   // Excel with multiple sheets:
 *   exportTableToExcel([
 *     { sheetName: 'Incidents', rows: reportRows, columns: reportCols },
 *     { sheetName: 'Actions',   rows: actionRows, columns: actionCols },
 *   ], 'hse-monthly-report');
 *
 *   // PDF incident report:
 *   exportReportToPdf(report, org, 'Incident Report');
 *
 *   // PDF KPI snapshot:
 *   exportKpiPdf(snapshot, org, 'KPI Report Q1 2024');
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TableColumn {
  key: string;
  label: string;
  /** Width hint for Excel (in characters) */
  width?: number;
  /** Format function for cell values */
  format?: (value: any, row: any) => string;
}

export interface SheetConfig {
  sheetName: string;
  rows: Record<string, any>[];
  columns: TableColumn[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export (no external dependency)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export a flat list of rows to a CSV file.
 * Handles commas, quotes, and newlines in cell values automatically.
 */
export function exportTableToCsv(
  rows: Record<string, any>[],
  columns: TableColumn[],
  filename: string,
): void {
  const escape = (val: any): string => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) =>
    columns.map((col) => {
      const raw = row[col.key];
      const val = col.format ? col.format(raw, row) : raw;
      return escape(val);
    }).join(','),
  );

  const csv = [header, ...body].join('\n');
  downloadBlob(csv, `${filename}.csv`, 'text/csv');
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel export (uses xlsx / SheetJS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export one or more sheets to an .xlsx file.
 * Each SheetConfig becomes one tab in the workbook.
 */
export async function exportTableToExcel(
  sheets: SheetConfig[],
  filename: string,
): Promise<void> {
  // Dynamic import so the ~500KB xlsx bundle only loads when needed
  const XLSX = await import('xlsx').catch(() => null);
  if (!XLSX) {
    console.error('[exportUtils] xlsx not installed. Run: npm install xlsx');
    // Fallback: export first sheet as CSV
    if (sheets[0]) exportTableToCsv(sheets[0].rows, sheets[0].columns, filename);
    return;
  }

  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headerRow = sheet.columns.map((c) => c.label);
    const dataRows = sheet.rows.map((row) =>
      sheet.columns.map((col) => {
        const raw = row[col.key];
        return col.format ? col.format(raw, row) : (raw ?? '');
      }),
    );

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

    // Column widths
    ws['!cols'] = sheet.columns.map((c) => ({ wch: c.width ?? 20 }));

    // Header row style (bold + background) — xlsx-style needed for full styling
    // Basic approach: set header as first row
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.slice(0, 31));
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF export (uses jsPDF + jspdf-autotable)
// ─────────────────────────────────────────────────────────────────────────────

interface PdfOptions {
  title: string;
  subtitle?: string;
  orgName?: string;
  logoDataUrl?: string;
  orientation?: 'portrait' | 'landscape';
  footerText?: string;
}

/**
 * Export a table to a styled PDF.
 * Includes organisation name, title, date, and page numbers.
 */
export async function exportTableToPdf(
  rows: Record<string, any>[],
  columns: TableColumn[],
  filename: string,
  options: PdfOptions,
): Promise<void> {
  const { jsPDF } = await import('jspdf').catch(() => ({ jsPDF: null })) as any;
  if (!jsPDF) {
    console.error('[exportUtils] jsPDF not installed. Run: npm install jspdf jspdf-autotable');
    exportTableToCsv(rows, columns, filename);
    return;
  }

  await import('jspdf-autotable').catch(() => null);

  const doc = new jsPDF({ orientation: options.orientation ?? 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // Header bar
  doc.setFillColor(24, 95, 165); // blue-600
  doc.rect(0, 0, pageW, 22, 'F');

  // Org name
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(options.orgName ?? 'EviroSafe HSE Platform', margin, 8);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title, margin, 16);

  y = 30;

  // Subtitle + date
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(options.subtitle, margin, y);
    y += 6;
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, margin, y);
  y += 8;

  // Table
  const tableRows = rows.map((row) =>
    columns.map((col) => {
      const raw = row[col.key];
      return col.format ? col.format(raw, row) : (raw ?? '');
    }),
  );

  (doc as any).autoTable({
    head: [columns.map((c) => c.label)],
    body: tableRows,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didDrawPage: (data: any) => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const pageStr = `Page ${doc.internal.getCurrentPageInfo().pageNumber}`;
      doc.text(pageStr, pageW - margin, pageH - 8, { align: 'right' });
      if (options.footerText) {
        doc.text(options.footerText, margin, pageH - 8);
      }
    },
  });

  doc.save(`${filename}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-specific PDF exporters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export a single incident report to a formatted PDF.
 */
export async function exportReportToPdf(
  report: Record<string, any>,
  orgName: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf').catch(() => ({ jsPDF: null })) as any;
  if (!jsPDF) { console.error('jsPDF not installed'); return; }
  await import('jspdf-autotable').catch(() => null);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(24, 95, 165);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text(orgName, margin, 8);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Incident Report', margin, 16);

  let y = 30;

  // Report ID + date
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text(`Report ID: ${report.id ?? 'N/A'}`, margin, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${report.incident_date ?? report.created_at ?? 'Unknown'}`, margin, y); y += 5;
  doc.text(`Type: ${report.incident_type ?? 'N/A'}`, margin, y); y += 5;
  doc.text(`Severity: ${report.severity ?? 'N/A'}`, margin, y); y += 5;
  doc.text(`Location: ${report.location ?? 'N/A'}`, margin, y); y += 5;
  doc.text(`Status: ${report.status ?? 'N/A'}`, margin, y); y += 8;

  // Divider
  doc.setDrawColor(200, 200, 200); doc.line(margin, y, pageW - margin, y); y += 5;

  // Description
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
  doc.text('Description', margin, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
  const descLines = doc.splitTextToSize(report.description ?? 'No description provided.', pageW - margin * 2);
  doc.text(descLines, margin, y); y += descLines.length * 4 + 4;

  // CAPA
  if (report.capa?.length) {
    doc.line(margin, y, pageW - margin, y); y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
    doc.text('Corrective Actions (CAPA)', margin, y); y += 5;

    (doc as any).autoTable({
      head: [['#', 'Action', 'Owner', 'Due Date', 'Status']],
      body: report.capa.map((c: any, i: number) => [
        i + 1, c.action ?? '', c.owner_id ?? '', c.due_date ?? '', c.status ?? '',
      ]),
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [24, 95, 165], textColor: 255 },
    });
  }

  // Footer
  doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated by EviroSafe on ${new Date().toLocaleString('en-GB')} · CONFIDENTIAL`,
    margin, doc.internal.pageSize.getHeight() - 8,
  );

  doc.save(`incident-report-${report.id ?? 'export'}.pdf`);
}

/**
 * Export a KPI snapshot summary to PDF.
 */
export async function exportKpiPdf(
  snapshot: Record<string, any>,
  orgName: string,
  title = 'KPI Report',
): Promise<void> {
  const rows = [
    { metric: 'LTIFR',                    value: snapshot.ltifr?.toFixed(2) ?? '0',   unit: 'per 1M hrs' },
    { metric: 'TRIFR',                    value: snapshot.trifr?.toFixed(2) ?? '0',   unit: 'per 1M hrs' },
    { metric: 'Near-Miss Rate',            value: snapshot.nmfr?.toFixed(2) ?? '0',    unit: 'per 1M hrs' },
    { metric: 'Severity Rate',            value: snapshot.sr?.toFixed(2) ?? '0',      unit: 'lost days / 1M hrs' },
    { metric: 'Fatalities',               value: String(snapshot.fatalities ?? 0),    unit: 'count' },
    { metric: 'Lost Time Injuries',       value: String(snapshot.lostTimeInjuries ?? 0), unit: 'count' },
    { metric: 'Medical Treatment Cases',  value: String(snapshot.medicalTreatmentCases ?? 0), unit: 'count' },
    { metric: 'Near Misses',              value: String(snapshot.nearMisses ?? 0),    unit: 'count' },
    { metric: 'Total Lost Days',          value: String(snapshot.totalLostDays ?? 0), unit: 'days' },
    { metric: 'Total Man Hours',          value: snapshot.totalManHours?.toLocaleString() ?? '0', unit: 'hours' },
    { metric: 'Action Completion Rate',   value: `${snapshot.actionCompletionRate ?? 0}%`, unit: '' },
    { metric: 'Training Compliance',      value: `${snapshot.trainingComplianceRate ?? 0}%`, unit: '' },
    { metric: 'TBT Sessions',             value: String(snapshot.toolboxTalksHeld ?? 0), unit: 'sessions' },
    { metric: 'Inspections Completed',    value: String(snapshot.inspectionsCompleted ?? 0), unit: 'inspections' },
  ];

  await exportTableToPdf(
    rows,
    [
      { key: 'metric', label: 'KPI', width: 35 },
      { key: 'value',  label: 'Value', width: 15 },
      { key: 'unit',   label: 'Unit',  width: 25 },
    ],
    `kpi-report-${new Date().toISOString().slice(0, 10)}`,
    {
      title,
      orgName,
      subtitle: `Period: ${snapshot.period?.from?.slice(0, 10) ?? ''} to ${snapshot.period?.to?.slice(0, 10) ?? ''}`,
      footerText: 'CONFIDENTIAL — HSE Management System',
    },
  );
}

/**
 * Export a compliance register to PDF.
 */
export async function exportCompliancePdf(
  items: Record<string, any>[],
  orgName: string,
): Promise<void> {
  await exportTableToPdf(
    items,
    [
      { key: 'standard', label: 'Standard', width: 12 },
      { key: 'clause',   label: 'Clause',   width: 10 },
      { key: 'title',    label: 'Title',    width: 35 },
      { key: 'status',   label: 'Status',   width: 14 },
      { key: 'owner_id', label: 'Owner',    width: 15 },
      { key: 'review_date', label: 'Review', width: 12 },
    ],
    `compliance-register-${new Date().toISOString().slice(0, 10)}`,
    { title: 'Compliance Register', orgName, orientation: 'landscape' },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convenience: format a date field consistently across all exports.
 */
export function formatExportDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}