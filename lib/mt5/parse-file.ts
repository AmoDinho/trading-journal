import { parseReport, rowsFromCsv, rowsFromHtml } from "@/lib/mt5/parse";
import type { FileMeta, ParsedReport, ReportFormat } from "@/lib/mt5/types";

const MAX_BYTES = 20 * 1024 * 1024;

export async function parseMt5File(
  file: File,
): Promise<{ report: ParsedReport; meta: FileMeta }> {
  if (file.size > MAX_BYTES) {
    throw new Error("File exceeds 20 MB");
  }

  const format = detectFormat(file);
  if (!format) {
    throw new Error("Use an MT5 history report (.xlsx, .csv, or .html)");
  }

  const started = performance.now();
  let rows: string[][];

  if (format === "html") {
    rows = rowsFromHtml(await file.text());
  } else if (format === "csv") {
    rows = rowsFromCsv(await readText(file));
  } else {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
    if (!sheet) throw new Error("The spreadsheet is empty");
    rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as string[][];
  }

  const report = parseReport(rows);
  if (JSON.stringify(report).includes("SHOULD NEVER APPEAR")) {
    throw new Error("Parser leaked account holder name");
  }
  if (report.trades.length === 0 && report.cashFlows.length === 0) {
    throw new Error(
      "No closed positions found. Use an MT5 History report with a Positions table (HTML, Excel, or CSV).",
    );
  }

  return {
    report,
    meta: {
      name: file.name,
      size: file.size,
      format,
      parsedMs: Math.round(performance.now() - started),
    },
  };
}

async function readText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function detectFormat(file: File): ReportFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".html") || name.endsWith(".htm")) return "html";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    return "csv";
  }
  if (file.type.includes("html")) return "html";
  if (file.type.includes("csv") || file.type.includes("tab-separated")) return "csv";
  return null;
}
