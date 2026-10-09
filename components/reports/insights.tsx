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

type CashFlowRow = {
  id: string;
  accountId: string;
  type: string;
  amount: number;
  time: string;
  comment: string | null;
};

export function InsightsReport({
  trades,
  accounts,
  playbooks,
  cashFlows,
  timeZone,
}: {
  trades: TradeRow[];
  accounts: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
  cashFlows: CashFlowRow[];
  timeZone: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Insights");
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
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`shrink-0 pb-2 ${
              tab === item ? "border-b-2 border-fg text-fg" : "text-faint"
            }`}
          >
            {item}
          </button>
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

      {tab !== "Insights" ? (
        <Breakdown
          tab={tab}
          trades={filtered}
          playbooks={playbooks}
          cashFlows={cashFlows.filter(
            (f) => !filters.accountId || f.accountId === filters.accountId,
          )}
          timeZone={timeZone}
        />
      ) : (
      <>
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
      )}
    </>
  );
}

function groupRows(trades: TradeRow[], keyFn: (t: TradeRow) => string) {
  const map = new Map<string, TradeRow[]>();
  for (const t of trades) {
    const key = keyFn(t);
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const wins = list.filter((t) => t.net > 0.005).length;
      const decided = list.filter((t) => Math.abs(t.net) > 0.005).length;
      return {
        key,
        count: list.length,
        winPct: decided === 0 ? 0 : (wins / decided) * 100,
        net: list.reduce((s, t) => s + t.net, 0),
      };
    })
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

function Breakdown({
  tab,
  trades,
  playbooks,
  cashFlows,
  timeZone,
}: {
  tab: string;
  trades: TradeRow[];
  playbooks: { id: string; name: string }[];
  cashFlows: CashFlowRow[];
  timeZone: string;
}) {
  const playbookName = (id: string | null) =>
    playbooks.find((p) => p.id === id)?.name ?? "Unassigned";

  let rows: { key: string; count: number; winPct: number; net: number }[] = [];
  if (tab === "Symbols") rows = groupRows(trades, (t) => t.symbol);
  else if (tab === "Long vs short")
    rows = groupRows(trades, (t) => (t.side === "short" ? "Short" : "Long"));
  else if (tab === "Wins vs losses")
    rows = groupRows(trades, (t) =>
      t.net > 0.005 ? "Wins" : t.net < -0.005 ? "Losses" : "Breakeven",
    );
  else if (tab === "Exit reasons") rows = groupRows(trades, (t) => t.exitReason);
  else if (tab === "Tags")
    rows = groupRows(
      trades.flatMap((t) =>
        t.tags.length ? t.tags.map((tag) => ({ ...t, _k: tag.name })) : [{ ...t, _k: "Untagged" }],
      ) as (TradeRow & { _k: string })[],
      (t) => (t as TradeRow & { _k: string })._k,
    );
  else if (tab === "Playbooks")
    rows = groupRows(trades, (t) => playbookName(t.playbookId));
  else if (tab === "Day & time")
    rows = groupRows(trades, (t) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "long",
      }).format(new Date(t.closeTime)),
    );
  else if (tab === "Overview")
    rows = groupRows(trades, (t) => t.symbol).slice(0, 8);
  else if (tab === "Deposits") {
    return (
      <section className="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
        <h2 className="text-[16px] font-semibold">Deposits</h2>
        <table className="mt-3 w-full text-left text-[13.5px]">
          <thead className="text-[11px] tracking-wide text-faint uppercase">
            <tr>
              <th className="py-2 font-medium">When</th>
              <th className="font-medium">Type</th>
              <th className="font-medium">Amount</th>
              <th className="font-medium">Comment</th>
            </tr>
          </thead>
          <tbody>
            {cashFlows.map((f) => (
              <tr key={f.id} className="border-t border-line">
                <td className="py-2.5">{new Date(f.time).toLocaleString("en-GB")}</td>
                <td className="capitalize">{f.type}</td>
                <td className={`tabular-nums ${moneyClass(f.amount)}`}>
                  {formatMoney(f.amount)}
                </td>
                <td className="text-faint">{f.comment ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
      <h2 className="text-[16px] font-semibold">{tab}</h2>
      <table className="mt-3 w-full text-left text-[13.5px]">
        <thead className="text-[11px] tracking-wide text-faint uppercase">
          <tr>
            <th className="py-2 font-medium">Bucket</th>
            <th className="font-medium">Trades</th>
            <th className="font-medium">Win %</th>
            <th className="font-medium">Net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-line">
              <td className="py-2.5 capitalize">{row.key.replaceAll("_", " ")}</td>
              <td className="tabular-nums">{row.count}</td>
              <td className="tabular-nums">{row.winPct.toFixed(1)}%</td>
              <td className={`tabular-nums ${moneyClass(row.net)}`}>
                {formatMoney(row.net)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
