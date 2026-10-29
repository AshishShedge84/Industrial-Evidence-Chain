/**
 * Industrial Evidence Chain (IEC) - CSV Export Utility
 * 
 * Complies with RFC 4180 CSV specifications and provides robust protection
 * against CSV formula injection (DDE / Command Injection in Excel/Calc/Numbers).
 */

export interface CsvColumn<T = any> {
  header: string;
  accessor: (row: T) => any;
}

/**
 * Formula injection prevention characters.
 * Any untrusted cell value starting with these characters (including with leading whitespace)
 * will be prefixed with a single quote (') so spreadsheet applications (Excel, Numbers, Calc)
 * strictly treat them as literal text instead of executable formulas.
 */
const FORMULA_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitize an individual CSV cell value against formula injection and format per RFC 4180.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert numbers, booleans, strings, or objects
  let str: string;
  if (typeof value === 'object') {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  // Formula injection check: check if first non-whitespace character is a formula operator
  const trimmed = str.trimStart();
  if (FORMULA_INJECTION_PREFIXES.some((char) => trimmed.startsWith(char))) {
    // Prefix with single quote to neutralize formula execution in Excel/Numbers/Sheets
    str = `'${str}`;
  }

  // RFC 4180 quoting and escaping:
  // If the string contains a double-quote, comma, newline, carriage return,
  // or begins with our single quote prefix, wrap in double-quotes and escape internal quotes by doubling them.
  if (/[",\n\r]/.test(str) || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate standard CSV content from records and column specifications.
 */
export function buildCsvContent<T>(records: T[], columns: CsvColumn<T>[]): string {
  // 1. Build header row
  const headerRow = columns.map((col) => sanitizeCsvCell(col.header)).join(',');

  // 2. Build data rows
  const dataRows = records.map((record) => {
    return columns.map((col) => sanitizeCsvCell(col.accessor(record))).join(',');
  });

  // Combine with CRLF (RFC 4180 standard newline)
  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Download a CSV file in the browser with UTF-8 BOM encoding.
 * 
 * The \uFEFF Byte Order Mark ensures Microsoft Excel (both Windows and macOS)
 * correctly identifies the file as UTF-8 rather than ANSI / Windows-1252.
 */
export function triggerBrowserCsvDownload(
  csvContent: string,
  filename: string
): { success: boolean; filename: string; byteCount: number } {
  try {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);

    return {
      success: true,
      filename,
      byteCount: blob.size,
    };
  } catch (error) {
    console.error('Failed to trigger CSV download:', error);
    throw error;
  }
}

/**
 * Format today's date for filenames (e.g. IEC_System_Audit_Report_2026-10-29.csv)
 */
export function getStandardReportFilename(prefix: string = 'IEC_System_Audit_Report'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${prefix}_${year}-${month}-${day}.csv`;
}
