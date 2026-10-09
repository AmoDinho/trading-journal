"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  EMPTY_FILTERS,
  filterTrades,
  type TradeFilters,
} from "@/lib/filter-trades";
import { formatMoney, moneyClass } from "@/lib/format";
import {
  computeInsights,
  DAY_INSIGHTS,
  insightTradeIds,
  TRADE_INSIGHTS,
  type InsightId,
} from "@/lib/insights";
import type { TradeRow } from "@/lib/trade-query";

const TABS = [
  "Overview",
  "Day & time",
  "Symbols",
  "Long vs short",
  "Wins vs losses",
  "Exit reasons",
  "Tags",
  "Playbooks",
  "Insights",
  "Deposits",
] as const;

export function InsightsReport({
  trades,
  accounts,
  timeZone,
}: {
  trades: TradeRow[];
  accounts: { id: string; name: string }[];
  timeZone: string;
}) {
  const [filters, setFilters] = useState<TradeFilters>(EMPTY_FILTERS);
  const filtered = useMemo(
    () => filterTrades(trades, { ...filters, insight: "" }, timeZone),
    [trades, filters, timeZone],
  );
  const insights = useMemo(
    () => computeInsights(filtered, timeZone),
    [filtered, timeZone],
  );

  const tradeRows = TRADE_INSIGHTS.map((def) => {
    const ids = insightTradeIds(insights, filtered, timeZone, def.id);
    const subset = filtered.filter((t) => ids.includes(t.id));
    const wins = subset.filter((t) => t.net > 0.005).length;
    const decided = subset.filter((t) => Math.abs(t.net) > 0.005).length;
    return {
      ...def,
      count: subset.length,
      winPct: decided === 0 ? 0 : (wins / decided) * 100,
      net: subset.reduce((s, t) => s + t.net, 0),
    };
  });

  const dayRows = DAY_INSIGHTS.map((def) => {
    const dates = Object.entries(insights.dayFlags)
      .filter(([, flags]) => flags.includes(def.id))
      .map(([date]) => date);
    const ids = insightTradeIds(insights, filtered, timeZone, def.id);
    const subset = filtered.filter((t) => ids.includes(t.id));
    return {
      ...def,
      count: dates.length,
      net: subset.reduce((s, t) => s + t.net, 0),
    };
  });

  const moneyRows = tradeRows.filter((r) => r.count > 0);
  const maxAbs = Math.max(1, ...moneyRows.map((r) => Math.abs(r.net)));
  const accountLabel = filters.accountId
    ? accounts.find((a) => a.id === filters.accountId)?.name
    : "All accounts";

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${accountLabel} · ${filtered.length} trades`}
      />
      <div className="mt-5 flex gap-4 overflow-x-auto border-b border-line text-[13.5px]">
        {TABS.map((tab) => (
          <span
            key={tab}
            className={`shrink-0 pb-2 ${
              tab === "Insights"
                ? "border-b-2 border-fg text-fg"
                : "text-faint"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
        <select
          value={filters.accountId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, accountId: e.target.value }))
          }
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={filters.range}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              range: e.target.value as TradeFilters["range"],
            }))
          }
          className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
        >
          <option value="all">All time</option>
          <option value="7d">7D</option>
          <option value="30d">30D</option>
          <option value="90d">90D</option>
          <option value="ytd">YTD</option>
        </select>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Where the money went</h2>
            <p className="text-[12px] text-faint">
              Net P&L of trades flagged · trades can carry several flags
            </p>
          </div>
          <div className="mt-4 space-y-2">
            {moneyRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[160px_1fr_90px] items-center gap-3 text-[13.5px]">
                <span>{row.label}</span>
                <div className="h-3 overflow-hidden rounded-sm bg-canvas">
                  <div
                    className={`h-full ${row.net < 0 ? "bg-loss" : "bg-profit"}`}
                    style={{ width: `${(Math.abs(row.net) / maxAbs) * 100}%` }}
                  />
                </div>
                <span className={`text-right tabular-nums ${moneyClass(row.net)}`}>
                  {formatMoney(row.net)}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
          <h2 className="text-[16px] font-semibold">If you removed the leaks</h2>
          <p className="mt-1 text-[12.5px] text-faint">
            Net P&L excluding every trade flagged as a margin stop-out, revenge
            trade or unusual size.
          </p>
          <div className="mt-6 flex items-end gap-4">
            <div>
              <p className="text-[12px] text-faint">Actual</p>
              <p className={`text-[28px] font-semibold tabular-nums ${moneyClass(insights.actualNet)}`}>
                {formatMoney(insights.actualNet)}
              </p>
            </div>
            <span className="mb-2 text-faint">→</span>
            <div>
              <p className="text-[12px] text-faint">Without flagged trades</p>
              <p className={`text-[28px] font-semibold tabular-nums ${moneyClass(insights.leaksNet)}`}>
                {formatMoney(insights.leaksNet)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[12.5px] text-faint">
            Uses only timing, size, side and outcome from the MT5 export.
          </p>
        </section>
      </div>

      <Table
        title="Trade-level insights"
        countLabel={`${TRADE_INSIGHTS.length} rules`}
        headers={["Insight", "Rule", "Trades", "Win %", "Net", ""]}
        rows={tradeRows.map((row) => [
          row.label,
          row.rule,
          String(row.count),
          `${row.winPct.toFixed(1)}%`,
          formatMoney(row.net),
          row.id,
        ])}
        nets={tradeRows.map((r) => r.net)}
        href={(id) => `/trades?insight=${id}`}
        linkLabel="View trades"
      />
      <Table
        title="Day-level insights"
        countLabel={`${DAY_INSIGHTS.length} rules · days in ${timeZone}`}
        headers={["Insight", "Rule", "Days", "Net", ""]}
        rows={dayRows.map((row) => [
          row.label,
          row.rule,
          String(row.count),
          formatMoney(row.net),
          row.id,
        ])}
        nets={dayRows.map((r) => r.net)}
        href={(id) => `/trades?insight=${id}`}
        linkLabel="View days"
      />
    </>
  );
}

function Table({
  title,
  countLabel,
  headers,
  rows,
  nets,
  href,
  linkLabel,
}: {
  title: string;
  countLabel: string;
  headers: string[];
  rows: string[][];
  nets: number[];
  href: (id: InsightId) => string;
  linkLabel: string;
}) {
  return (
    <section className="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <p className="text-[12px] text-faint">{countLabel}</p>
      </div>
      <table className="mt-3 w-full text-left text-[13.5px]">
        <thead className="text-[11px] tracking-wide text-faint uppercase">
          <tr>
            {headers.map((h) => (
              <th key={h} className="py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const id = row[row.length - 1] as InsightId;
            const cells = row.slice(0, -1);
            return (
              <tr key={id} className="border-t border-line">
                {cells.map((cell, j) => (
                  <td
                    key={j}
                    className={`py-2.5 ${j === cells.length - 1 ? `tabular-nums ${moneyClass(nets[i] ?? 0)}` : j >= 2 ? "tabular-nums" : ""}`}
                  >
                    {j === 0 ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            (nets[i] ?? 0) < 0 ? "bg-amber" : "bg-[#9ec1ff]"
                          }`}
                        />
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
                <td className="py-2.5">
                  <Link href={href(id)} className="text-[#9ec1ff]">
                    {linkLabel}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
