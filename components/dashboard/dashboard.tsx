"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarHeatmap,
} from "@/components/dashboard/calendar";
import { DailyBars, DrawdownChart, EquityChart } from "@/components/dashboard/spark";
import { ExitChip } from "@/components/exit-chip";
import { PageHeader } from "@/components/page-header";
import {
  buildMonth,
  dashboardKpis,
  dayNets,
  equityMeta,
  equitySeries,
  monthLabel,
} from "@/lib/dashboard-stats";
import {
  EMPTY_FILTERS,
  filterTrades,
  type TradeFilters,
} from "@/lib/filter-trades";
import {
  formatCloseTime,
  formatMasked,
  formatMoney,
  formatVolume,
  moneyClass,
} from "@/lib/format";
import {
  computeInsights,
  DAY_INSIGHTS,
  insightTradeIds,
  TRADE_INSIGHTS,
  type InsightId,
} from "@/lib/insights";
import type { TradeRow } from "@/lib/trade-query";

function ratio(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

export function Dashboard({
  trades,
  accounts,
  playbooks,
  tags,
  timeZone,
}: {
  trades: TradeRow[];
  accounts: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
  tags: { id: string; category: string; name: string }[];
  timeZone: string;
}) {
  const [filters, setFilters] = useState<TradeFilters>({
    ...EMPTY_FILTERS,
    range: "all",
  });
  const [hide, setHide] = useState(false);
  const latest = trades[0] ? new Date(trades[0].closeTime) : new Date();
  const [month, setMonth] = useState({
    year: latest.getFullYear(),
    index: latest.getMonth(),
  });

  const filtered = useMemo(
    () => filterTrades(trades, filters, timeZone),
    [trades, filters, timeZone],
  );
  const kpis = dashboardKpis(filtered, timeZone);
  const equity = equitySeries(filtered);
  const { peak, maxDrawdown } = equityMeta(equity);
  const byDay = dayNets(filtered, timeZone);
  const weeks = buildMonth(month.year, month.index, byDay);
  const monthNet = weeks.reduce((s, w) => s + w.weekNet, 0);
  const monthDays = weeks.flatMap((w) =>
    w.days.filter((d) => d.inMonth).map((d) => ({ date: d.date, net: d.net })),
  );
  const recent = filtered.slice(0, 8);
  const symbols = [...new Set(trades.map((t) => t.symbol))].sort();
  const insights = useMemo(
    () => computeInsights(filtered, timeZone),
    [filtered, timeZone],
  );
  const stopOutDates = new Set(
    Object.entries(insights.dayFlags)
      .filter(([, flags]) => flags.includes("stop_out_day"))
      .map(([date]) => date),
  );
  const patternRows = [...TRADE_INSIGHTS, ...DAY_INSIGHTS]
    .map((def) => {
      const ids = insightTradeIds(insights, filtered, timeZone, def.id);
      const subset = filtered.filter((t) => ids.includes(t.id));
      const dayCount = Object.values(insights.dayFlags).filter((flags) =>
        flags.includes(def.id as never),
      ).length;
      const isDay = DAY_INSIGHTS.some((d) => d.id === def.id);
      return {
        id: def.id as InsightId,
        label: def.label,
        count: isDay ? dayCount : subset.length,
        unit: isDay ? "Day" : "Trade",
        net: subset.reduce((s, t) => s + t.net, 0),
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 5);

  function setFilter<K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function shiftMonth(delta: number) {
    const d = new Date(month.year, month.index + delta, 1);
    setMonth({ year: d.getFullYear(), index: d.getMonth() });
  }

  const accountLabel = filters.accountId
    ? accounts.find((a) => a.id === filters.accountId)?.name
    : "All accounts";

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${accountLabel} · times in ${timeZone}`}
        action={
          <Link
            href="/import"
            className="inline-flex items-center gap-2 rounded-lg bg-fg px-3.5 py-2 text-[13.5px] font-medium text-canvas"
          >
            Import MT5 report
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
        <select
          value={filters.accountId}
          onChange={(e) => setFilter("accountId", e.target.value)}
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {(["7d", "30d", "90d", "ytd", "all"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setFilter("range", r)}
            className={`rounded-lg px-3 py-1.5 ring-1 ${
              filters.range === r ? "bg-surface ring-fg/40" : "ring-line text-faint"
            }`}
          >
            {r === "all" ? "All" : r.toUpperCase()}
          </button>
        ))}
        <select
          value={filters.symbol}
          onChange={(e) => setFilter("symbol", e.target.value)}
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">+ Symbol</option>
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.side}
          onChange={(e) => setFilter("side", e.target.value)}
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">+ Side</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
        <select
          value={filters.tagId}
          onChange={(e) => setFilter("tagId", e.target.value)}
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">+ Tag</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={filters.playbookId}
          onChange={(e) => setFilter("playbookId", e.target.value)}
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">+ Playbook</option>
          {playbooks.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filters.outcome}
          onChange={(e) => setFilter("outcome", e.target.value)}
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">+ Outcome</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>
        <select
          value={filters.insight}
          onChange={(e) => setFilter("insight", e.target.value)}
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">+ Insight</option>
          {[...TRADE_INSIGHTS, ...DAY_INSIGHTS].map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setHide((v) => !v)}
          className="ml-auto rounded-lg px-3 py-1.5 ring-1 ring-line"
          aria-label={hide ? "Show P&L" : "Hide P&L"}
        >
          {hide ? "Show P&L" : "Hide P&L"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Net P&L"
          value={formatMasked(kpis.net, hide)}
          tone={kpis.net}
          hint={`${kpis.trades} trades`}
        />
        <Kpi
          label="Trade win %"
          value={`${kpis.winPct.toFixed(1)}%`}
          tone={kpis.winPct - 50}
          hint={`${kpis.wins} won · ${kpis.losses} lost · ${kpis.breakeven} breakeven`}
        />
        <Kpi
          label="Profit factor"
          value={ratio(kpis.pf)}
          tone={kpis.pf - 1}
          hint="Gross won ÷ gross lost"
        />
        <Kpi
          label="Day win %"
          value={`${kpis.dayWinPct.toFixed(1)}%`}
          tone={kpis.dayWinPct - 50}
          hint={`${kpis.greenDays} green · ${kpis.redDays} red days`}
        />
        <Kpi
          label="Avg win / loss"
          value={hide ? "••••" : ratio(kpis.avgWinLoss)}
          tone={kpis.avgWinLoss - 1}
          hint={`${formatMasked(kpis.avgWin, hide)} avg win · ${formatMasked(-kpis.avgLoss, hide)} avg loss`}
        />
        <Kpi
          label="Expectancy"
          value={formatMasked(kpis.expectancy, hide)}
          tone={kpis.expectancy}
          hint="Per trade"
        />
      </div>

      <section className="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
        <div className="flex items-start justify-between">
          <h2 className="text-[16px] font-semibold">Cumulative P&L</h2>
          <p className="text-[12.5px] text-faint">
            Peak {formatMasked(peak, hide)} · Max drawdown{" "}
            {formatMasked(maxDrawdown, hide)}
          </p>
        </div>
        <EquityChart points={equity} hide={hide} />
        <p className="mt-3 text-[12px] tracking-wide text-faint uppercase">Drawdown</p>
        <DrawdownChart points={equity} />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <CalendarHeatmap
          label={monthLabel(month.year, month.index)}
          weeks={weeks}
          monthNet={monthNet}
          hide={hide}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          stopOutDates={stopOutDates}
        />
        <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Patterns</h2>
            <Link href="/reports" className="text-[13px] text-[#9ec1ff]">
              All insights
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {patternRows.map((row) => (
              <Link
                key={row.id}
                href={`/trades?insight=${row.id}`}
                className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2.5 ring-1 ring-line"
              >
                <div>
                  <p className="text-[13.5px]">{row.label}</p>
                  <p className="text-[12px] text-faint">
                    {row.count} {row.unit.toLowerCase()}
                    {row.count === 1 ? "" : "s"}
                  </p>
                </div>
                <span className={`tabular-nums ${moneyClass(row.net)}`}>
                  {hide ? "••••" : formatMoney(row.net)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
        <h2 className="text-[16px] font-semibold">
          Daily P&L · {monthLabel(month.year, month.index)}
        </h2>
        <div className="mt-4">
          <DailyBars days={monthDays} hide={hide} />
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Recent trades</h2>
          <Link href="/trades" className="text-[13px] text-[#9ec1ff]">
            Open trade log
          </Link>
        </div>
        <table className="mt-3 w-full text-left text-[13.5px]">
          <thead className="text-[11px] tracking-wide text-faint uppercase">
            <tr>
              <th className="py-2 font-medium">Closed</th>
              <th className="font-medium">Symbol</th>
              <th className="font-medium">Side</th>
              <th className="font-medium">Volume</th>
              <th className="font-medium">Exit</th>
              <th className="font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="py-2.5 text-faint">{formatCloseTime(row.closeTime)}</td>
                <td className="font-medium">{row.symbol}</td>
                <td className="capitalize">{row.side}</td>
                <td className="tabular-nums">{formatVolume(row.volume)}</td>
                <td>
                  <ExitChip reason={row.exitReason} />
                </td>
                <td className={`tabular-nums ${moneyClass(row.net)}`}>
                  {formatMasked(row.net, hide)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: number;
}) {
  return (
    <div className="rounded-xl bg-surface px-4 py-4 ring-1 ring-line">
      <p className="text-[11px] tracking-wide text-faint uppercase">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold tabular-nums ${moneyClass(tone)}`}>
        {value}
      </p>
      <p className="mt-1 text-[12px] text-faint">{hint}</p>
    </div>
  );
}
