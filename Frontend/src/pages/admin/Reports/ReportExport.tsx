import type { PerformanceReport, ReportRange } from "../Reports";
import ExcelJS from "exceljs";

/* ---------- Shared wording (used by the page and by the Excel sheet) ---------- */

export const RANGE_LABELS: Record<ReportRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

/** "CALL_BACK_REQUESTED" -> "Call back requested" */
export const humanize = (value: string): string => {
  const text = value.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const FORMULAS = [
  {
    name: "Call coverage rate",
    formula: "Unique assigned leads contacted ÷ Total assigned leads × 100",
    note: "A lead called five times still counts as one contacted lead. Only calls inside the selected period count.",
  },
  {
    name: "Connection rate",
    formula: "Connected calls ÷ Total calls × 100",
    note: "Only calls inside the selected period count. The outcomes that count as connected are listed below.",
  },
  {
    name: "Conversion rate",
    formula: "Converted leads ÷ Total assigned leads × 100",
    note: "Each converted lead counts once, not the number of calls marked Converted. This is a snapshot, so the period does not change it.",
  },
] as const;

export const ZERO_RULE = "If the denominator is zero, the rate is shown as 0%.";

/* ---------- File contents ---------- */

const HEADERS = [
  "Executive",
  "Assigned leads",
  "Leads contacted",
  "Call coverage rate (%)",
  "Total calls",
  "Connected calls",
  "Connection rate (%)",
  "Converted leads",
  "Conversion rate (%)",
];

/** Stops Excel from running a name like =SUM(...) as a formula */
const safe = (v: string | number): string | number =>
  typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v;

function tableRows(report: PerformanceReport): (string | number)[][] {
  const rows = report.executives.map((e) => [
    safe(e.name),
    e.assignedLeads,
    e.leadsContacted,
    e.callCoverageRate,
    e.totalCalls,
    e.connectedCalls,
    e.connectionRate,
    e.convertedLeads,
    e.conversionRate,
  ]);
  const t = report.totals;
  rows.push([
    "Team total",
    t.assignedLeads,
    t.leadsContacted,
    t.callCoverageRate,
    t.totalCalls,
    t.connectedCalls,
    t.connectionRate,
    t.convertedLeads,
    t.conversionRate,
  ]);
  return rows;
}

function fileName(report: PerformanceReport, ext: "csv" | "xlsx"): string {
  return `pgfy-sales-performance-${report.range}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- CSV ---------- */

export function exportCsv(report: PerformanceReport) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [HEADERS, ...tableRows(report)].map((row) => row.map(esc).join(","));
  // The BOM makes Excel read the file as UTF-8
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  saveBlob(blob, fileName(report, "csv"));
}

/* ---------- Excel (.xlsx) ---------- */

export async function exportExcel(report: PerformanceReport) {
  // Sirf download click par load hota hai, isse page slow nahi hota
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PGfy Sales CRM";

  /* ----- Sheet 1: executive performance ----- */
  const sheet = workbook.addWorksheet("Executive performance", {
    views: [{ state: "frozen", ySplit: 1 }], // header upar fixed rahega
  });

  sheet.columns = [
    { header: "Executive", key: "name", width: 26 },
    { header: "Assigned leads", key: "assignedLeads", width: 16 },
    { header: "Leads contacted", key: "leadsContacted", width: 16 },
    { header: "Call coverage rate (%)", key: "callCoverageRate", width: 22 },
    { header: "Total calls", key: "totalCalls", width: 14 },
    { header: "Connected calls", key: "connectedCalls", width: 16 },
    { header: "Connection rate (%)", key: "connectionRate", width: 20 },
    { header: "Converted leads", key: "convertedLeads", width: 16 },
    { header: "Conversion rate (%)", key: "conversionRate", width: 20 },
  ];

  report.executives.forEach((e) => {
    sheet.addRow({
      name: e.name,
      assignedLeads: e.assignedLeads,
      leadsContacted: e.leadsContacted,
      callCoverageRate: e.callCoverageRate,
      totalCalls: e.totalCalls,
      connectedCalls: e.connectedCalls,
      connectionRate: e.connectionRate,
      convertedLeads: e.convertedLeads,
      conversionRate: e.conversionRate,
    });
  });

  const t = report.totals;
  const totalRow = sheet.addRow({
    name: "Team total",
    assignedLeads: t.assignedLeads,
    leadsContacted: t.leadsContacted,
    callCoverageRate: t.callCoverageRate,
    totalCalls: t.totalCalls,
    connectedCalls: t.connectedCalls,
    connectionRate: t.connectionRate,
    convertedLeads: t.convertedLeads,
    conversionRate: t.conversionRate,
  });
  totalRow.font = { bold: true };

  // Header ki styling
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FF1E3A8A" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  header.alignment = { vertical: "middle", wrapText: true };

  // Rate columns ek decimal tak dikhaye (66.7)
  ["callCoverageRate", "connectionRate", "conversionRate"].forEach((key) => {
    sheet.getColumn(key).numFmt = "0.0";
  });

  /* ----- Sheet 2: formulas aur rules ----- */
  const info = workbook.addWorksheet("How it is calculated");
  info.columns = [{ width: 24 }, { width: 62 }, { width: 90 }];

  info.addRow(["PGfy Sales CRM: executive performance report"]).font = { bold: true, size: 14 };
  info.addRow(["Period", RANGE_LABELS[report.range]]);
  info.addRow([
    "Calls counted from",
    report.from ? new Date(report.from).toLocaleDateString("en-IN") : "The beginning",
  ]);
  info.addRow(["Generated", new Date(report.generatedAt).toLocaleString("en-IN")]);
  info.addRow([]);
  info.addRow(["Metric", "Formula", "Notes"]).font = { bold: true };
  FORMULAS.forEach((f) => info.addRow([f.name, f.formula, f.note]));
  info.addRow([]);
  info.addRow(["Connected outcomes", report.connectedOutcomes.map(humanize).join(", ")]);
  info.addRow(["Not connected", "Busy, Not answered, Switched off"]);
  info.addRow(["Zero denominators", ZERO_RULE]);

  /* ----- Download ----- */
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveBlob(blob, fileName(report, "xlsx")); // pehle se file mein hain
}