import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { journalEntry } from "@/lib/db/schema";
import { dayKey } from "@/lib/format";
import { computeInsights, type DayInsightId } from "@/lib/insights";
import type { TradeRow } from "@/lib/trade-query";

export type JournalDay = {
  date: string;
  weekday: string;
  label: string;
  net: number;
  trades: TradeRow[];
  written: boolean;
  plan: string;
  happened: string;
  lessons: string;
  updatedAt: string | null;
  insights: DayInsightId[];
};

export async function loadJournal(userId: string, trades: TradeRow[], timeZone: string) {
  const entries = await db
    .select()
    .from(journalEntry)
    .where(eq(journalEntry.userId, userId));
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const insights = computeInsights(trades, timeZone);

  const grouped = new Map<string, TradeRow[]>();
  for (const t of trades) {
    const key = dayKey(t.closeTime, timeZone);
    const list = grouped.get(key) ?? [];
    list.push(t);
    grouped.set(key, list);
  }

  const days: JournalDay[] = [...grouped.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, dayTrades]) => {
      const entry = byDate.get(date);
      const written = Boolean(
        entry && (entry.plan || entry.happened || entry.lessons),
      );
      const d = new Date(`${date}T12:00:00`);
      return {
        date,
        weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
        label: d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        net: dayTrades.reduce((s, t) => s + t.net, 0),
        trades: dayTrades.sort(
          (a, b) =>
            new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime(),
        ),
        written,
        plan: entry?.plan ?? "",
        happened: entry?.happened ?? "",
        lessons: entry?.lessons ?? "",
        updatedAt: entry?.updatedAt.toISOString() ?? null,
        insights: insights.dayFlags[date] ?? [],
      };
    });

  return { days, tradeFlags: insights.tradeFlags };
}
