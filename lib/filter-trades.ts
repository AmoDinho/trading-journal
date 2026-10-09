import { dayKey } from "@/lib/format";
import type { TradeRow } from "@/lib/trade-query";

export type TradeFilters = {
  accountId: string;
  range: "7d" | "30d" | "90d" | "ytd" | "all";
  redDays: boolean;
  symbol: string;
  side: string;
  tagId: string;
  outcome: string;
};

export const EMPTY_FILTERS: TradeFilters = {
  accountId: "",
  range: "all",
  redDays: false,
  symbol: "",
  side: "",
  tagId: "",
  outcome: "",
};

export function filterTrades(
  trades: TradeRow[],
  filters: TradeFilters,
  timeZone: string,
): TradeRow[] {
  const now = Date.now();
  const start = rangeStart(filters.range, now);
  let rows = trades.filter((t) => {
    if (filters.accountId && t.accountId !== filters.accountId) return false;
    if (start && new Date(t.closeTime).getTime() < start) return false;
    if (filters.symbol && t.symbol !== filters.symbol) return false;
    if (filters.side && t.side !== filters.side) return false;
    if (filters.tagId && !t.tags.some((tag) => tag.id === filters.tagId)) {
      return false;
    }
    if (filters.outcome) {
      const outcome = netOutcome(t.net);
      if (outcome !== filters.outcome) return false;
    }
    return true;
  });

  if (filters.redDays) {
    const byDay = new Map<string, number>();
    for (const t of rows) {
      const key = dayKey(t.closeTime, timeZone);
      byDay.set(key, (byDay.get(key) ?? 0) + t.net);
    }
    const red = new Set(
      [...byDay.entries()].filter(([, net]) => net < 0).map(([key]) => key),
    );
    rows = rows.filter((t) => red.has(dayKey(t.closeTime, timeZone)));
  }

  return rows;
}

export function filterStats(trades: TradeRow[]) {
  const net = trades.reduce((s, t) => s + t.net, 0);
  const wins = trades.filter((t) => t.net > 0);
  const losses = trades.filter((t) => t.net < 0);
  const decided = wins.length + losses.length;
  const winPct = decided === 0 ? 0 : (wins.length / decided) * 100;
  const grossWin = wins.reduce((s, t) => s + t.net, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net, 0));
  const pf = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;
  return { net, winPct, pf, count: trades.length };
}

function netOutcome(net: number): "win" | "loss" | "breakeven" {
  if (net > 0.005) return "win";
  if (net < -0.005) return "loss";
  return "breakeven";
}

function rangeStart(range: TradeFilters["range"], now: number): number | null {
  const day = 24 * 60 * 60 * 1000;
  if (range === "7d") return now - 7 * day;
  if (range === "30d") return now - 30 * day;
  if (range === "90d") return now - 90 * day;
  if (range === "ytd") return new Date(new Date(now).getFullYear(), 0, 1).getTime();
  return null;
}
