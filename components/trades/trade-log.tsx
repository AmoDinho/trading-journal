"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ExitChip } from "@/components/exit-chip";
import { PageHeader } from "@/components/page-header";
import { TagChip } from "@/components/tag-chip";
import { TradeDrawer } from "@/components/trades/drawer";
import {
  EMPTY_FILTERS,
  filterStats,
  filterTrades,
  type TradeFilters,
} from "@/lib/filter-trades";
import {
  formatCloseTime,
  formatHold,
  formatMoney,
  formatR,
  formatVolume,
  moneyClass,
  rMultiple,
} from "@/lib/format";
import { computeInsights, INSIGHT_LABEL, type InsightId } from "@/lib/insights";
import type { TradeRow } from "@/lib/trade-query";

export function TradeLog({
  trades: initial,
  accounts,
  playbooks,
  tags,
  timeZone,
  initialDate = "",
  initialInsight = "",
}: {
  trades: TradeRow[];
  accounts: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
  tags: { id: string; category: string; name: string }[];
  timeZone: string;
  initialDate?: string;
  initialInsight?: string;
}) {
  const [trades, setTrades] = useState(initial);
  const [allTags, setAllTags] = useState(tags);
  const [filters, setFilters] = useState<TradeFilters>({
    ...EMPTY_FILTERS,
    date: initialDate,
    insight: initialInsight,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo(
    () => filterTrades(trades, filters, timeZone),
    [trades, filters, timeZone],
  );
  const stats = filterStats(filtered);
  const symbols = [...new Set(trades.map((t) => t.symbol))].sort();
  const insightResult = useMemo(
    () => computeInsights(trades, timeZone),
    [trades, timeZone],
  );

  const openIndex = openId
    ? filtered.findIndex((t) => t.id === openId)
    : -1;
  const openTrade = openIndex >= 0 ? filtered[openIndex] : null;

  function setFilter<K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setCursor(0);
  }

  function move(delta: number) {
    if (filtered.length === 0) return;
    const next = (cursor + delta + filtered.length) % filtered.length;
    setCursor(next);
    if (openId) setOpenId(filtered[next]!.id);
  }

  function replace(next: TradeRow) {
    setTrades((rows) => rows.map((row) => (row.id === next.id ? next : row)));
  }

  const subtitle = filters.date
    ? `${filtered.length} of ${trades.length} trades · ${filters.date}`
    : filters.redDays && filtered.length !== trades.length
      ? `${filtered.length} of ${trades.length} trades · red days only`
      : `${filtered.length} of ${trades.length} trades`;

  return (
    <div className="-mx-8 -my-7 flex min-h-screen">
      <div className="min-w-0 flex-1 px-8 py-7">
        <PageHeader
          title="Trade log"
          subtitle={subtitle}
          action={
            <p className="text-[13.5px] tabular-nums">
              Net{" "}
              <span className={moneyClass(stats.net)}>{formatMoney(stats.net)}</span>
              <span className="mx-2 text-faint">·</span>
              Win {stats.winPct.toFixed(1)}%
              <span className="mx-2 text-faint">·</span>
              PF {Number.isFinite(stats.pf) ? stats.pf.toFixed(2) : "—"}
            </p>
          }
        />

        <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
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
          <select
            value={filters.range}
            onChange={(e) =>
              setFilter("range", e.target.value as TradeFilters["range"])
            }
            className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-line"
          >
            <option value="all">All time</option>
            <option value="7d">7D</option>
            <option value="30d">30D</option>
            <option value="90d">90D</option>
            <option value="ytd">YTD</option>
          </select>
          <button
            type="button"
            onClick={() => setFilter("redDays", !filters.redDays)}
            className={`rounded-lg px-3 py-1.5 ring-1 ${
              filters.redDays ? "bg-surface ring-fg/40" : "ring-line text-faint"
            }`}
          >
            Days: red only
          </button>
          {filters.date ? (
            <button
              type="button"
              onClick={() => setFilter("date", "")}
              className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-fg/40"
            >
              {filters.date} ×
            </button>
          ) : null}
          {filters.insight ? (
            <button
              type="button"
              onClick={() => setFilter("insight", "")}
              className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-fg/40"
            >
              {INSIGHT_LABEL[filters.insight as InsightId] ?? filters.insight} ×
            </button>
          ) : null}
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
            {allTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No trades match"
            body="Clear a filter or import an MT5 report."
          />
        ) : (
          <div
            className="mt-4 overflow-x-auto rounded-xl ring-1 ring-line outline-none"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const row = filtered[cursor];
                if (row) setOpenId(row.id);
              }
            }}
          >
            <table className="w-full text-left text-[13.5px]">
              <thead className="text-[11px] tracking-wide text-faint uppercase">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Closed</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 font-medium">Vol</th>
                  <th className="px-4 py-3 font-medium">Hold</th>
                  <th className="px-4 py-3 font-medium">Net</th>
                  <th className="px-4 py-3 font-medium">R</th>
                  <th className="px-4 py-3 font-medium">Exit</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const r = rMultiple(
                    row.side,
                    row.openPrice,
                    row.closePrice,
                    row.initialStop,
                  );
                  const active = row.id === (openId ?? filtered[cursor]?.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => {
                        setCursor(i);
                        setOpenId(row.id);
                      }}
                      className={`cursor-pointer border-b border-line last:border-0 ${
                        active ? "bg-surface" : "hover:bg-surface/50"
                      }`}
                    >
                      <td
                        className={`px-4 py-3 text-faint ${
                          active ? "shadow-[-2px_0_0_0_#e8eaed]" : ""
                        }`}
                      >
                        {formatCloseTime(row.closeTime)}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.symbol}</td>
                      <td className="px-4 py-3 capitalize">{row.side}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatVolume(row.volume)}
                      </td>
                      <td className="px-4 py-3 text-faint">
                        {formatHold(row.openTime, row.closeTime)}
                      </td>
                      <td className={`px-4 py-3 tabular-nums ${moneyClass(row.net)}`}>
                        {formatMoney(row.net)}
                      </td>
                      <td className={`px-4 py-3 tabular-nums ${moneyClass(r ?? 0)}`}>
                        {formatR(r)}
                      </td>
                      <td className="px-4 py-3">
                        <ExitChip reason={row.exitReason} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.tags.map((t) => (
                            <TagChip
                              key={t.id}
                              category={t.category}
                              name={t.name}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-line px-4 py-2 text-[12px] text-faint">
              Showing {filtered.length} trades · ↑ ↓ to move, Enter to open · Stop at
              close comes from the report
            </p>
          </div>
        )}
      </div>
      {openTrade ? (
        <TradeDrawer
          key={openTrade.id}
          trade={openTrade}
          index={openIndex}
          total={filtered.length}
          playbooks={playbooks}
          tags={allTags}
          onClose={() => setOpenId(null)}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          onChange={replace}
          onTagCreated={(tag) =>
            setAllTags((current) =>
              current.some((t) => t.id === tag.id) ? current : [...current, tag],
            )
          }
          insights={insightResult.tradeFlags[openTrade.id] ?? []}
        />
      ) : null}
    </div>
  );
}
