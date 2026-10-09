"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ExitChip } from "@/components/exit-chip";
import { InsightChip } from "@/components/insight-chip";
import { IntradayChart } from "@/components/journal/intraday";
import { PageHeader } from "@/components/page-header";
import { formatMoney, moneyClass } from "@/lib/format";
import { INSIGHT_LABEL, type TradeInsightId } from "@/lib/insights";
import type { JournalDay } from "@/lib/journal";

export function JournalView({
  days,
  tradeFlags,
  selectedDate,
}: {
  days: JournalDay[];
  tradeFlags: Record<string, TradeInsightId[]>;
  selectedDate: string;
}) {
  const router = useRouter();
  const selected = days.find((d) => d.date === selectedDate) ?? days[0];
  const writtenCount = days.filter((d) => d.written).length;
  const chrono = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );
  const chronoIndex = Math.max(
    0,
    chrono.findIndex((d) => d.date === selected?.date),
  );

  function go(delta: number) {
    const next = chrono[chronoIndex + delta];
    if (next) router.push(`/journal?date=${next.date}`);
  }

  if (!selected) return null;

  const wins = selected.trades.filter((t) => t.net > 0.005);
  const losses = selected.trades.filter((t) => t.net < -0.005);
  const decided = wins.length + losses.length;
  const winPct = decided === 0 ? 0 : (wins.length / decided) * 100;
  const grossWin = wins.reduce((s, t) => s + t.net, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net, 0));
  const pf = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;
  const largestLoss = selected.trades.reduce(
    (m, t) => (t.net < m ? t.net : m),
    0,
  );

  return (
    <div className="-mx-8 -my-7 flex min-h-screen">
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-line bg-ink">
        <div className="px-5 py-5">
          <PageHeader
            title="Journal"
            subtitle={`${writtenCount} of ${days.length} days written`}
          />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {days.map((day) => {
            const active = day.date === selected.date;
            return (
              <Link
                key={day.date}
                href={`/journal?date=${day.date}`}
                className={`mb-1 flex items-start justify-between rounded-lg px-3 py-2.5 ${
                  active ? "bg-surface" : "hover:bg-surface/50"
                }`}
              >
                <div className="flex gap-2">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      day.written ? "bg-[#9ec1ff]" : "ring-1 ring-faint"
                    }`}
                  />
                  <div>
                    <p className="text-[13.5px]">
                      {day.weekday} {day.date.slice(8)} {monthShort(day.date)}
                    </p>
                    <p className="text-[12px] text-faint">
                      {day.trades.length} trades · {day.written ? "Written" : "Not written"}
                    </p>
                  </div>
                </div>
                <span className={`text-[13.5px] tabular-nums ${moneyClass(day.net)}`}>
                  {formatMoney(day.net)}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-wide text-faint uppercase">Day review</p>
            <h1 className="text-[28px] font-semibold tracking-tight">{selected.label}</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={chronoIndex <= 0}
              className="rounded-lg px-3 py-1.5 ring-1 ring-line disabled:opacity-40"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={chronoIndex >= chrono.length - 1}
              className="rounded-lg px-3 py-1.5 ring-1 ring-line disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Net P&L" value={formatMoney(selected.net)} tone={selected.net} />
          <Kpi label="Trades" value={String(selected.trades.length)} tone={0} />
          <Kpi label="Win rate" value={`${winPct.toFixed(1)}%`} tone={winPct - 50} />
          <Kpi
            label="Profit factor"
            value={Number.isFinite(pf) ? pf.toFixed(2) : "—"}
            tone={pf - 1}
          />
          <Kpi
            label="Largest loss"
            value={formatMoney(largestLoss)}
            tone={largestLoss}
          />
        </div>

        {selected.insights.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {selected.insights.map((id) => (
              <InsightChip key={id} id={id} />
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <DayFields key={selected.date} day={selected} />
          <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
            <h2 className="text-[16px] font-semibold">Intraday P&L</h2>
            <div className="mt-3">
              <IntradayChart trades={selected.trades} />
            </div>
            <p className="mt-4 text-[12px] text-faint">
              Trades · {selected.trades.length}
            </p>
            <ul className="mt-2 space-y-2 text-[13.5px]">
              {selected.trades.map((t) => {
                const flags = tradeFlags[t.id] ?? [];
                const time = new Date(t.closeTime).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3">
                    <span className="text-faint tabular-nums">{time}</span>
                    <span className="flex-1">
                      {t.symbol} · {t.side === "short" ? "Short" : "Long"}
                    </span>
                    <span className="flex gap-1">
                      {flags.slice(0, 1).map((id) => (
                        <span key={id} className="text-[12px] text-faint">
                          {INSIGHT_LABEL[id]}
                        </span>
                      ))}
                    </span>
                    <ExitChip reason={t.exitReason} />
                    <span className={`w-20 text-right tabular-nums ${moneyClass(t.net)}`}>
                      {formatMoney(t.net)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              href={`/trades?date=${selected.date}`}
              className="mt-4 inline-block text-[13px] text-[#9ec1ff]"
            >
              All {selected.trades.length} trades in the log
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}

function DayFields({ day }: { day: JournalDay }) {
  const router = useRouter();
  const [plan, setPlan] = useState(day.plan);
  const [happened, setHappened] = useState(day.happened);
  const [lessons, setLessons] = useState(day.lessons);
  const [savedAt, setSavedAt] = useState(day.updatedAt);
  const timer = useRef<number | null>(null);

  function queue(next: { plan: string; happened: string; lessons: string }) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const res = await fetch(`/api/journal/${day.date}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { updatedAt: string };
      setSavedAt(body.updatedAt);
      router.refresh();
    }, 400);
  }

  return (
    <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Journal entry</h2>
        {savedAt ? (
          <span className="text-[12px] text-profit">
            Saved{" "}
            {new Date(savedAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>
      <Field
        label="Plan"
        value={plan}
        onChange={(v) => {
          setPlan(v);
          queue({ plan: v, happened, lessons });
        }}
      />
      <Field
        label="What happened"
        value={happened}
        onChange={(v) => {
          setHappened(v);
          queue({ plan, happened: v, lessons });
        }}
      />
      <Field
        label="Lessons"
        value={lessons}
        onChange={(v) => {
          setLessons(v);
          queue({ plan, happened, lessons: v });
        }}
      />
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-[12px] text-faint">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 w-full resize-none rounded-lg bg-canvas px-3 py-2 text-[13.5px] outline-none ring-1 ring-line"
      />
    </label>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: number;
}) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
      <p className="text-[11px] tracking-wide text-faint uppercase">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tabular-nums ${moneyClass(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function monthShort(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    month: "short",
  });
}
