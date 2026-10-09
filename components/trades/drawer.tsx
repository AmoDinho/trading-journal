"use client";

import { useEffect, useRef, useState } from "react";
import { ExitChip } from "@/components/exit-chip";
import { TagChip } from "@/components/tag-chip";
import {
  formatHold,
  formatMoney,
  formatOpened,
  formatPrice,
  formatR,
  formatVolume,
  moneyClass,
  rMultiple,
} from "@/lib/format";
import type { TradeRow } from "@/lib/trade-query";

const CATEGORIES = [
  { id: "setup", label: "Setup" },
  { id: "mistakes", label: "Mistakes" },
  { id: "emotions", label: "Emotions" },
] as const;

export function TradeDrawer({
  trade,
  index,
  total,
  playbooks,
  tags,
  onClose,
  onPrev,
  onNext,
  onChange,
  onTagCreated,
}: {
  trade: TradeRow;
  index: number;
  total: number;
  playbooks: { id: string; name: string }[];
  tags: { id: string; category: string; name: string }[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onChange: (next: TradeRow) => void;
  onTagCreated: (tag: { id: string; category: string; name: string }) => void;
}) {
  const [notes, setNotes] = useState(trade.notes);
  const [stop, setStop] = useState(trade.initialStop?.toString() ?? "");
  const [adding, setAdding] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const r = rMultiple(trade.side, trade.openPrice, trade.closePrice, trade.initialStop);

  function patch(body: Record<string, unknown>, next: TradeRow) {
    onChange(next);
    void fetch(`/api/trades/${trade.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function queueNotes(value: string) {
    setNotes(value);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      patch({ notes: value }, { ...trade, notes: value });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    }, 400);
  }

  async function addTag(category: string) {
    const name = newTag.trim();
    if (!name) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name, tradeId: trade.id }),
    });
    if (!res.ok) return;
    const created = (await res.json()) as { id: string; category: string; name: string };
    onTagCreated(created);
    onChange({
      ...trade,
      tags: [...trade.tags.filter((t) => t.id !== created.id), created],
    });
    setNewTag("");
    setAdding(null);
  }

  function toggleTag(id: string) {
    const has = trade.tags.some((t) => t.id === id);
    const nextTags = has
      ? trade.tags.filter((t) => t.id !== id)
      : [...trade.tags, tags.find((t) => t.id === id)!].filter(Boolean);
    patch({ tagIds: nextTags.map((t) => t.id) }, { ...trade, tags: nextTags });
  }

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-line bg-ink">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-lg px-2 py-1 text-[13px] ring-1 ring-line"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg px-2 py-1 text-[13px] ring-1 ring-line"
          >
            Next ›
          </button>
        </div>
        <p className="text-[12.5px] text-faint">
          {index + 1} of {total}
        </p>
        <button type="button" onClick={onClose} className="text-faint hover:text-fg">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="text-[13px] text-faint">
          {trade.symbol} · {trade.side === "short" ? "Short" : "Long"} ·{" "}
          {formatVolume(trade.volume)} lots · {trade.accountName}
        </p>
        <p className={`mt-1 text-[32px] font-semibold tabular-nums ${moneyClass(trade.net)}`}>
          {formatMoney(trade.net)}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-[13.5px]">
          <div>
            <dt className="text-faint">Opened</dt>
            <dd className="mt-0.5">{formatOpened(trade.openTime)}</dd>
          </div>
          <div>
            <dt className="text-faint">Closed · held {formatHold(trade.openTime, trade.closeTime)}</dt>
            <dd className="mt-0.5">{formatOpened(trade.closeTime)}</dd>
          </div>
          <div>
            <dt className="text-faint">Entry</dt>
            <dd className="mt-0.5 tabular-nums">{formatPrice(trade.openPrice)}</dd>
          </div>
          <div>
            <dt className="text-faint">Exit</dt>
            <dd className="mt-0.5 tabular-nums">{formatPrice(trade.closePrice)}</dd>
          </div>
          <div>
            <dt className="text-faint">Stop at close</dt>
            <dd className="mt-0.5 tabular-nums">
              {trade.stopLoss == null ? "—" : formatPrice(trade.stopLoss)}
            </dd>
          </div>
          <div>
            <dt className="text-faint">Commission · swap</dt>
            <dd className="mt-0.5 tabular-nums">
              {formatMoney(trade.commission)} · {formatMoney(trade.swap)}
            </dd>
          </div>
        </dl>

        <div className="mt-3">
          <ExitChip reason={trade.exitReason} />
        </div>

        <label className="mt-5 block">
          <span className="text-[12px] text-faint">Initial stop</span>
          <span className="ml-2 text-[12px] text-faint">
            R uses this stop, not the stop at close.
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={stop}
              onChange={(e) => setStop(e.target.value)}
              onBlur={() => {
                const n = stop.trim() === "" ? null : Number(stop);
                const value = n == null || !Number.isFinite(n) ? null : n;
                patch({ initialStop: value }, { ...trade, initialStop: value });
              }}
              className="w-full rounded-lg bg-surface px-3 py-2 text-[14px] outline-none ring-1 ring-line"
            />
            <span className={`shrink-0 tabular-nums ${moneyClass(r ?? 0)}`}>
              {formatR(r)}
            </span>
          </div>
        </label>

        <div className="mt-5">
          <p className="text-[12px] text-faint">Execution rating</p>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  patch(
                    { rating: trade.rating === n ? null : n },
                    { ...trade, rating: trade.rating === n ? null : n },
                  )
                }
                className={`h-8 w-8 rounded-lg ring-1 ring-line ${
                  trade.rating && trade.rating >= n
                    ? "bg-amber text-canvas"
                    : "text-faint"
                }`}
                aria-label={`${n} star`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-[12px] text-faint">Playbook</span>
          <select
            value={trade.playbookId ?? ""}
            onChange={(e) =>
              patch(
                { playbookId: e.target.value || null },
                { ...trade, playbookId: e.target.value || null },
              )
            }
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[14px] ring-1 ring-line"
          >
            <option value="">None</option>
            {playbooks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5">
          <p className="text-[12px] text-faint">Tags</p>
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="mt-2">
              <p className="text-[12px] text-faint">{cat.label}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tags
                  .filter((t) => t.category === cat.id)
                  .map((t) => {
                    const on = trade.tags.some((x) => x.id === t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={on ? "" : "opacity-40"}
                      >
                        <TagChip category={t.category} name={t.name} />
                      </button>
                    );
                  })}
                {adding === cat.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void addTag(cat.id);
                    }}
                  >
                    <input
                      autoFocus
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onBlur={() => {
                        if (!newTag.trim()) setAdding(null);
                      }}
                      className="w-28 rounded-md bg-surface px-2 py-0.5 text-[12px] ring-1 ring-line"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(cat.id);
                      setNewTag("");
                    }}
                    className="rounded-md px-2 py-0.5 text-[12px] text-faint ring-1 ring-dashed ring-line"
                  >
                    + Add tag
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="flex items-center justify-between text-[12px] text-faint">
            Notes
            {saved ? <span className="text-profit">Saved</span> : null}
          </span>
          <textarea
            value={notes}
            onChange={(e) => queueNotes(e.target.value)}
            rows={5}
            className="mt-1 w-full resize-none rounded-lg bg-surface px-3 py-2 text-[13.5px] outline-none ring-1 ring-line"
          />
        </label>
      </div>
    </aside>
  );
}
