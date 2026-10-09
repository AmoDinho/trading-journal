import { dayKey } from "@/lib/format";
import type { TradeRow } from "@/lib/trade-query";

export type TradeInsightId =
  | "margin_stop_out"
  | "no_stop_loss"
  | "held_loser_too_long"
  | "unusual_size"
  | "revenge_trade"
  | "sized_up_after_streak"
  | "stacked_entry"
  | "quick_clean_win";

export type DayInsightId =
  | "stop_out_day"
  | "losses_outweighed_win_rate"
  | "overtrading_day"
  | "revenge_cycle"
  | "flip_flop_day"
  | "low_efficiency"
  | "high_conviction_day"
  | "patient_green_day";

export type InsightId = TradeInsightId | DayInsightId;

export const TRADE_INSIGHTS: {
  id: TradeInsightId;
  label: string;
  rule: string;
  leak?: boolean;
}[] = [
  {
    id: "margin_stop_out",
    label: "Margin stop-out",
    rule: "Exit reason is stop-out",
    leak: true,
  },
  {
    id: "no_stop_loss",
    label: "No stop loss",
    rule: "No S/L on the position at close",
  },
  {
    id: "held_loser_too_long",
    label: "Held loser too long",
    rule: "Losing hold > 2× median, loss > average loss",
  },
  {
    id: "unusual_size",
    label: "Unusual size",
    rule: "Volume > 75th pct of prior 60 days and ≥ 2× median",
    leak: true,
  },
  {
    id: "revenge_trade",
    label: "Revenge trade",
    rule: "Opened within 2 min of a losing close, and lost",
    leak: true,
  },
  {
    id: "sized_up_after_streak",
    label: "Sized up after a streak",
    rule: "Volume up after 3+ wins, and lost",
  },
  {
    id: "stacked_entry",
    label: "Stacked entry",
    rule: "3+ same symbol and side within 60 s",
  },
  {
    id: "quick_clean_win",
    label: "Quick clean win",
    rule: "Winner held under half the average winning hold",
  },
];

export const DAY_INSIGHTS: {
  id: DayInsightId;
  label: string;
  rule: string;
}[] = [
  {
    id: "stop_out_day",
    label: "Stop-out day",
    rule: "Any margin stop-out",
  },
  {
    id: "losses_outweighed_win_rate",
    label: "Losses outweighed a good win rate",
    rule: "Win rate ≥ 50%, red day, avg loss > avg win",
  },
  {
    id: "overtrading_day",
    label: "Overtrading day",
    rule: "≥ 4 trades and ≥ 2× the 60-day average",
  },
  {
    id: "revenge_cycle",
    label: "Revenge cycle",
    rule: "2+ revenge trades",
  },
  {
    id: "flip_flop_day",
    label: "Flip-flop day",
    rule: "3+ switches between long and short",
  },
  {
    id: "low_efficiency",
    label: "Low efficiency",
    rule: "3+ trades, net under 25% of avg green day",
  },
  {
    id: "high_conviction_day",
    label: "High conviction day",
    rule: "Exactly 1 trade, and it won",
  },
  {
    id: "patient_green_day",
    label: "Patient green day",
    rule: "Fewer trades than the 60-day average, and green",
  },
];

export const INSIGHT_LABEL: Record<InsightId, string> = Object.fromEntries(
  [...TRADE_INSIGHTS, ...DAY_INSIGHTS].map((i) => [i.id, i.label]),
) as Record<InsightId, string>;

const DAY_MS = 24 * 60 * 60 * 1000;
const LEAK_IDS: TradeInsightId[] = [
  "margin_stop_out",
  "revenge_trade",
  "unusual_size",
];

export type InsightResult = {
  tradeFlags: Record<string, TradeInsightId[]>;
  dayFlags: Record<string, DayInsightId[]>;
  actualNet: number;
  leaksNet: number;
  leakTradeIds: string[];
};

export function computeInsights(
  trades: TradeRow[],
  timeZone: string,
): InsightResult {
  const tradeFlags: Record<string, TradeInsightId[]> = {};
  const add = (id: string, flag: TradeInsightId) => {
    const list = tradeFlags[id] ?? [];
    if (!list.includes(flag)) list.push(flag);
    tradeFlags[id] = list;
  };

  const holds = trades.map(holdMs);
  const medianHold = median(holds);
  const losses = trades.filter((t) => t.net < -0.005);
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((s, t) => s + t.net, 0) / losses.length)
    : 0;
  const wins = trades.filter((t) => t.net > 0.005);
  const avgWinHold = wins.length
    ? wins.reduce((s, t) => s + holdMs(t), 0) / wins.length
    : 0;

  const byOpen = [...trades].sort(
    (a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime(),
  );
  const byClose = [...trades].sort(
    (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime(),
  );

  for (const t of trades) {
    if (t.exitReason === "stop_out") add(t.id, "margin_stop_out");
    if (t.stopLoss == null) add(t.id, "no_stop_loss");
    if (
      t.net < -0.005 &&
      medianHold > 0 &&
      holdMs(t) > 2 * medianHold &&
      Math.abs(t.net) > avgLoss
    ) {
      add(t.id, "held_loser_too_long");
    }
    if (t.net > 0.005 && avgWinHold > 0 && holdMs(t) < 0.5 * avgWinHold) {
      add(t.id, "quick_clean_win");
    }
  }

  for (const t of byOpen) {
    const open = new Date(t.openTime).getTime();
    const priorVol = byOpen
      .filter((p) => {
        const pt = new Date(p.openTime).getTime();
        return pt < open && pt >= open - 60 * DAY_MS;
      })
      .map((p) => p.volume);
    if (priorVol.length >= 4) {
      const p75 = percentile(priorVol, 0.75);
      const med = median(priorVol);
      if (t.volume > p75 && med > 0 && t.volume >= 2 * med) {
        add(t.id, "unusual_size");
      }
    }

    if (t.net < -0.005) {
      const revenge = byClose.some((p) => {
        if (p.id === t.id || p.net >= -0.005) return false;
        const close = new Date(p.closeTime).getTime();
        return close <= open && open - close <= 2 * 60 * 1000;
      });
      if (revenge) add(t.id, "revenge_trade");
    }
  }

  for (let i = 3; i < byOpen.length; i += 1) {
    const t = byOpen[i]!;
    const streak = byOpen.slice(i - 3, i);
    if (streak.every((p) => p.net > 0.005) && t.net < -0.005) {
      const avgVol = streak.reduce((s, p) => s + p.volume, 0) / streak.length;
      if (t.volume > avgVol) add(t.id, "sized_up_after_streak");
    }
  }

  for (const t of byOpen) {
    const open = new Date(t.openTime).getTime();
    const cluster = byOpen.filter((p) => {
      if (p.symbol !== t.symbol || p.side !== t.side) return false;
      return Math.abs(new Date(p.openTime).getTime() - open) <= 60 * 1000;
    });
    if (cluster.length >= 3) add(t.id, "stacked_entry");
  }

  const days = groupDays(trades, timeZone);
  const greenDays = [...days.values()].filter((d) => d.net > 0.005);
  const avgGreen = greenDays.length
    ? greenDays.reduce((s, d) => s + d.net, 0) / greenDays.length
    : 0;
  const dayFlags: Record<string, DayInsightId[]> = {};
  const addDay = (date: string, flag: DayInsightId) => {
    const list = dayFlags[date] ?? [];
    if (!list.includes(flag)) list.push(flag);
    dayFlags[date] = list;
  };

  for (const [date, day] of days) {
    const avg60 = averageDailyCount(days, date, 60);

    if (day.trades.some((t) => t.exitReason === "stop_out")) {
      addDay(date, "stop_out_day");
    }
    const dayWins = day.trades.filter((t) => t.net > 0.005);
    const dayLosses = day.trades.filter((t) => t.net < -0.005);
    const decided = dayWins.length + dayLosses.length;
    const winPct = decided === 0 ? 0 : dayWins.length / decided;
    const avgDayWin = dayWins.length
      ? dayWins.reduce((s, t) => s + t.net, 0) / dayWins.length
      : 0;
    const avgDayLoss = dayLosses.length
      ? Math.abs(dayLosses.reduce((s, t) => s + t.net, 0) / dayLosses.length)
      : 0;
    if (winPct >= 0.5 && day.net < -0.005 && avgDayLoss > avgDayWin) {
      addDay(date, "losses_outweighed_win_rate");
    }
    if (day.trades.length >= 4 && avg60 > 0 && day.trades.length >= 2 * avg60) {
      addDay(date, "overtrading_day");
    }
    const revengeCount = day.trades.filter((t) =>
      (tradeFlags[t.id] ?? []).includes("revenge_trade"),
    ).length;
    if (revengeCount >= 2) addDay(date, "revenge_cycle");

    const ordered = [...day.trades].sort(
      (a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime(),
    );
    let switches = 0;
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i]!.side !== ordered[i - 1]!.side) switches += 1;
    }
    if (switches >= 3) addDay(date, "flip_flop_day");

    if (
      day.trades.length >= 3 &&
      avgGreen > 0 &&
      day.net < 0.25 * avgGreen
    ) {
      addDay(date, "low_efficiency");
    }
    if (day.trades.length === 1 && day.trades[0]!.net > 0.005) {
      addDay(date, "high_conviction_day");
    }
    if (
      day.net > 0.005 &&
      avg60 > 0 &&
      day.trades.length < avg60
    ) {
      addDay(date, "patient_green_day");
    }
  }

  const actualNet = trades.reduce((s, t) => s + t.net, 0);
  const leakTradeIds = trades
    .filter((t) => (tradeFlags[t.id] ?? []).some((f) => LEAK_IDS.includes(f)))
    .map((t) => t.id);
  const leakSet = new Set(leakTradeIds);
  const leaksNet = trades
    .filter((t) => !leakSet.has(t.id))
    .reduce((s, t) => s + t.net, 0);

  return { tradeFlags, dayFlags, actualNet, leaksNet, leakTradeIds };
}

export function insightTradeIds(
  result: InsightResult,
  trades: TradeRow[],
  timeZone: string,
  id: InsightId,
): string[] {
  if (TRADE_INSIGHTS.some((i) => i.id === id)) {
    return trades
      .filter((t) => (result.tradeFlags[t.id] ?? []).includes(id as TradeInsightId))
      .map((t) => t.id);
  }
  const dates = new Set(
    Object.entries(result.dayFlags)
      .filter(([, flags]) => flags.includes(id as DayInsightId))
      .map(([date]) => date),
  );
  return trades
    .filter((t) => dates.has(dayKey(t.closeTime, timeZone)))
    .map((t) => t.id);
}

function groupDays(trades: TradeRow[], timeZone: string) {
  const map = new Map<string, { net: number; trades: TradeRow[] }>();
  for (const t of trades) {
    const key = dayKey(t.closeTime, timeZone);
    const cur = map.get(key) ?? { net: 0, trades: [] };
    cur.net += t.net;
    cur.trades.push(t);
    map.set(key, cur);
  }
  return map;
}

function averageDailyCount(
  days: Map<string, { net: number; trades: TradeRow[] }>,
  date: string,
  window: number,
) {
  const end = new Date(`${date}T12:00:00`);
  let sum = 0;
  for (let i = 1; i <= window; i += 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    sum += days.get(key)?.trades.length ?? 0;
  }
  return sum / window;
}

function holdMs(t: TradeRow) {
  return Math.max(
    0,
    new Date(t.closeTime).getTime() - new Date(t.openTime).getTime(),
  );
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return s[lo]!;
  return s[lo]! * (hi - i) + s[hi]! * (i - lo);
}
