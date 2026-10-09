import { dayKey } from "@/lib/format";
import type { TradeRow } from "@/lib/trade-query";

export type EquityPoint = {
  t: number;
  equity: number;
  drawdown: number;
};

export type DayCell = {
  date: string;
  day: number;
  net: number;
  trades: number;
  inMonth: boolean;
};

export type WeekRow = {
  days: DayCell[];
  weekNet: number;
};

export function dashboardKpis(trades: TradeRow[], timeZone: string) {
  const net = trades.reduce((s, t) => s + t.net, 0);
  const wins = trades.filter((t) => t.net > 0.005);
  const losses = trades.filter((t) => t.net < -0.005);
  const breakeven = trades.length - wins.length - losses.length;
  const decided = wins.length + losses.length;
  const winPct = decided === 0 ? 0 : (wins.length / decided) * 100;
  const grossWin = wins.reduce((s, t) => s + t.net, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net, 0));
  const pf = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const avgWinLoss = avgLoss === 0 ? (avgWin > 0 ? Infinity : 0) : avgWin / avgLoss;
  const expectancy = trades.length === 0 ? 0 : net / trades.length;

  const byDay = dayNets(trades, timeZone);
  const dayValues = [...byDay.values()].map((d) => d.net);
  const greenDays = dayValues.filter((n) => n > 0.005).length;
  const redDays = dayValues.filter((n) => n < -0.005).length;
  const dayDecided = greenDays + redDays;
  const dayWinPct = dayDecided === 0 ? 0 : (greenDays / dayDecided) * 100;

  return {
    net,
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winPct,
    pf,
    greenDays,
    redDays,
    dayWinPct,
    avgWin,
    avgLoss,
    avgWinLoss,
    expectancy,
  };
}

export function equitySeries(trades: TradeRow[]): EquityPoint[] {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime(),
  );
  const points: EquityPoint[] = [{ t: 0, equity: 0, drawdown: 0 }];
  let equity = 0;
  let peak = 0;
  for (const row of sorted) {
    equity += row.net;
    peak = Math.max(peak, equity);
    points.push({
      t: new Date(row.closeTime).getTime(),
      equity,
      drawdown: equity - peak,
    });
  }
  return points;
}

export function equityMeta(points: EquityPoint[]) {
  const peak = Math.max(0, ...points.map((p) => p.equity));
  const maxDrawdown = Math.min(0, ...points.map((p) => p.drawdown));
  return { peak, maxDrawdown };
}

export function dayNets(trades: TradeRow[], timeZone: string) {
  const map = new Map<string, { net: number; trades: number }>();
  for (const t of trades) {
    const key = dayKey(t.closeTime, timeZone);
    const cur = map.get(key) ?? { net: 0, trades: 0 };
    cur.net += t.net;
    cur.trades += 1;
    map.set(key, cur);
  }
  return map;
}

export function buildMonth(
  year: number,
  monthIndex: number,
  byDay: Map<string, { net: number; trades: number }>,
): WeekRow[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const start = new Date(first);
  const dow = start.getDay();
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));

  const weeks: WeekRow[] = [];
  const cursor = new Date(start);
  while (true) {
    const days: DayCell[] = [];
    let weekNet = 0;
    for (let i = 0; i < 5; i += 1) {
      const key = localYmd(cursor);
      const rec = byDay.get(key);
      const inMonth = cursor.getMonth() === monthIndex;
      const net = rec?.net ?? 0;
      days.push({
        date: key,
        day: cursor.getDate(),
        net,
        trades: rec?.trades ?? 0,
        inMonth,
      });
      if (inMonth) weekNet += net;
      cursor.setDate(cursor.getDate() + 1);
    }
    if (days.some((d) => d.inMonth)) {
      weeks.push({ days, weekNet });
    }
    cursor.setDate(cursor.getDate() + 2);
    if (cursor > last) break;
  }
  return weeks;
}

export function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
