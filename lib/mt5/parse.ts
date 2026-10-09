import type {
  CashFlowType,
  ExitReason,
  ParsedCashFlow,
  ParsedReport,
  ParsedTrade,
  ParseWarning,
  Side,
} from "@/lib/mt5/types";

const IDENTITY = /^(account|name|login|holder|client)\s*:/i;
const SECTION = /^(positions|orders|deals)$/i;
const TOTAL_NET = /total net profit\s*:?\s*(.+)$/i;

export function rowsFromHtml(html: string): string[][] {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const rows: string[][] = [];
  for (const table of tables) {
    const trs = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    for (const tr of trs) {
      const cells = [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(
        (m) => decodeHtml(stripTags(m[1])),
      );
      if (cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
    rows.push([]);
  }
  return rows;
}

export function parseReport(rows: string[][]): ParsedReport {
  const sections: Record<string, { headers: string[]; rows: string[][] }> = {};
  let current: string | null = null;
  let reportNetProfit: number | null = null;

  for (const raw of rows) {
    const cells = raw.map((c) => c.trim());
    if (cells.every((c) => !c)) continue;

    const first = cells[0] ?? "";
    if (IDENTITY.test(first)) continue;

    const joined = cells.filter(Boolean).join(" ");
    const netMatch = joined.match(TOTAL_NET);
    if (netMatch) {
      const n = parseNumber(netMatch[1] ?? "");
      if (n != null) reportNetProfit = n;
      continue;
    }

    const section = detectSection(cells);
    if (section) {
      current = section;
      sections[current] = { headers: [], rows: [] };
      continue;
    }

    if (!current) continue;

    if (isTotalRow(cells)) continue;

    if (
      sections[current].headers.length === 0 &&
      looksLikeHeader(cells)
    ) {
      sections[current].headers = cells.map((c) => c.toLowerCase());
      continue;
    }

    if (sections[current].headers.length > 0) {
      sections[current].rows.push(cells);
    }
  }

  const positionSection = sections.positions;
  const dealSection = sections.deals;
  const orderSection = sections.orders;

  const dealMaps = indexDeals(dealSection);
  const warnings: ParseWarning[] = [];
  const trades: ParsedTrade[] = [];
  let openPositions = 0;

  if (positionSection) {
    const col = columnIndex(positionSection.headers);
    for (const row of positionSection.rows) {
      const id = cell(row, col.position);
      const symbol = cell(row, col.symbol);
      const type = cell(row, col.type).toLowerCase();
      if (!id || !symbol) continue;
      if (type.includes("limit") || type.includes("stop")) continue;

      const openTime = parseMt5Time(cell(row, col.openTime));
      const closeTime = parseMt5Time(cell(row, col.closeTime));
      const openPrice = parseNumber(cell(row, col.openPrice));
      const closePrice = parseNumber(cell(row, col.closePrice));
      const volume = parseNumber(cell(row, col.volume));
      const profit = parseNumber(cell(row, col.profit));

      if (!closeTime || closePrice == null) {
        openPositions += 1;
        continue;
      }
      if (!openTime || openPrice == null || volume == null || profit == null) {
        continue;
      }

      const side: Side = type.includes("sell") ? "short" : "long";
      const outs = dealMaps.outs.get(id) ?? [];
      if (outs.length > 1) {
        warnings.push({
          kind: "partial_close",
          positionId: id,
          dealCount: outs.length,
        });
      }

      trades.push({
        mt5PositionId: id,
        symbol,
        side,
        volume,
        openTime: openTime.toISOString(),
        closeTime: closeTime.toISOString(),
        openPrice,
        closePrice,
        stopLoss: zeroAsNull(parseNumber(cell(row, col.stopLoss))),
        takeProfit: zeroAsNull(parseNumber(cell(row, col.takeProfit))),
        commission: parseNumber(cell(row, col.commission)) ?? 0,
        swap: parseNumber(cell(row, col.swap)) ?? 0,
        profit,
        exitReason: exitReasonFromDeals(outs),
      });
    }
  }

  const cashFlows: ParsedCashFlow[] = dealMaps.cashFlows;
  const workingOrders = countWorkingOrders(orderSection);

  const times = trades.flatMap((t) => [t.openTime, t.closeTime]).sort();
  if (reportNetProfit == null && trades.length > 0) {
    reportNetProfit = round2(trades.reduce((s, t) => s + t.profit, 0));
  }

  return {
    trades,
    cashFlows,
    openPositions,
    workingOrders,
    reportNetProfit,
    warnings,
    from: times[0] ?? null,
    to: times[times.length - 1] ?? null,
  };
}

function detectSection(cells: string[]): string | null {
  const token = (cells.find((c) => c.length > 0) ?? "").trim();
  const m = token.match(SECTION);
  return m ? m[1]!.toLowerCase() : null;
}

function looksLikeHeader(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return (
    joined.includes("symbol") &&
    (joined.includes("volume") || joined.includes("type"))
  );
}

function isTotalRow(cells: string[]): boolean {
  return /^total\b/i.test((cells[0] ?? "").trim());
}

function columnIndex(headers: string[]) {
  const found: Record<string, number[]> = {};
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (!key) return;
    found[key] = [...(found[key] ?? []), i];
  });
  const first = (...keys: string[]) => {
    for (const k of keys) {
      const i = found[k]?.[0];
      if (i != null) return i;
    }
    return -1;
  };
  const nth = (n: number, ...keys: string[]) => {
    for (const k of keys) {
      const i = found[k]?.[n];
      if (i != null) return i;
    }
    return first(...keys);
  };
  return {
    openTime: nth(0, "time", "open time"),
    closeTime: nth(1, "time", "close time"),
    position: first("position"),
    symbol: first("symbol"),
    type: first("type"),
    volume: first("volume"),
    openPrice: nth(0, "price"),
    closePrice: nth(1, "price"),
    stopLoss: first("s/l", "sl", "s l"),
    takeProfit: first("t/p", "tp", "t p"),
    commission: first("commission"),
    swap: first("swap"),
    profit: first("profit"),
    deal: first("deal"),
    direction: first("direction"),
    comment: first("comment"),
    order: first("order"),
    state: first("state"),
    balance: first("balance"),
  };
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, " ").replace(/\./g, "").trim();
}

function cell(row: string[], index: number): string {
  if (index < 0) return "";
  return (row[index] ?? "").trim();
}

function indexDeals(section?: { headers: string[]; rows: string[][] }) {
  const outs = new Map<string, string[]>();
  const cashFlows: ParsedCashFlow[] = [];
  if (!section) return { outs, cashFlows };

  const col = columnIndex(section.headers);
  for (const row of section.rows) {
    const type = cell(row, col.type).toLowerCase();
    const direction = cell(row, col.direction).toLowerCase();
    const comment = cell(row, col.comment);
    const dealId = cell(row, col.deal);
    const positionId = cell(row, col.position);
    const time = parseMt5Time(cell(row, col.openTime));
    const profit = parseNumber(cell(row, col.profit));

    if (type === "balance" || type === "credit" || type === "charge") {
      if (!dealId || !time || profit == null || profit === 0) continue;
      const flowType: CashFlowType = profit > 0 ? "deposit" : "withdrawal";
      cashFlows.push({
        mt5DealId: dealId,
        type: flowType,
        amount: profit,
        time: time.toISOString(),
        comment: comment || null,
      });
      continue;
    }

    if (positionId && (direction === "out" || direction === "out/in")) {
      const list = outs.get(positionId) ?? [];
      list.push(comment);
      outs.set(positionId, list);
    }
  }
  return { outs, cashFlows };
}

function exitReasonFromDeals(comments: string[]): ExitReason {
  const last = comments[comments.length - 1] ?? "";
  const text = comments.join(" ");
  if (/so:|\bstop[\s-]?out\b/i.test(last) || /so:|\bstop[\s-]?out\b/i.test(text)) {
    return "stop_out";
  }
  if (/\[sl\b|\bsl\b/i.test(last)) return "stop_loss";
  if (/\[tp\b|\btp\b/i.test(last)) return "take_profit";
  return "manual";
}

function countWorkingOrders(section?: { headers: string[]; rows: string[][] }) {
  if (!section) return 0;
  const col = columnIndex(section.headers);
  let count = 0;
  for (const row of section.rows) {
    const type = cell(row, col.type).toLowerCase();
    const state = cell(row, col.state).toLowerCase();
    if (!/limit|stop/.test(type)) continue;
    if (/filled|cancelled|canceled|expired/.test(state)) continue;
    count += 1;
  }
  return count;
}

export function parseNumber(value: string): number | null {
  const t = value.replace(/\s/g, "").replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseMt5Time(value: string): Date | null {
  const m = value.match(
    /(\d{4})[./-](\d{2})[./-](\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00"}:${m[5] ?? "00"}:${m[6] ?? "00"}+02:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function zeroAsNull(n: number | null): number | null {
  if (n == null || n === 0) return null;
  return n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}
