"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { formatMoney, moneyClass } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  trades: number;
  net: number;
  winPct: number;
};

export function PlaybooksView({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await fetch("/api/playbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/playbooks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Playbooks"
        subtitle="Setups you assign to trades"
        action={
          <form onSubmit={create} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New playbook"
              className="rounded-lg bg-surface px-3 py-2 text-[13.5px] ring-1 ring-line"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-fg px-3 py-2 text-[13.5px] font-medium text-canvas"
            >
              Add
            </button>
          </form>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No playbooks yet"
          body="Create named setups (for example London open breakout) and tag trades with them."
        />
      ) : (
        <table className="mt-6 w-full text-left text-[13.5px]">
          <thead className="text-[11px] tracking-wide text-faint uppercase">
            <tr>
              <th className="py-2 font-medium">Playbook</th>
              <th className="font-medium">Trades</th>
              <th className="font-medium">Win %</th>
              <th className="font-medium">Net</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="py-3 font-medium">{row.name}</td>
                <td className="tabular-nums">{row.trades}</td>
                <td className="tabular-nums">{row.winPct.toFixed(1)}%</td>
                <td className={`tabular-nums ${moneyClass(row.net)}`}>
                  {formatMoney(row.net)}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => void remove(row.id)}
                    className="text-[12.5px] text-faint hover:text-loss"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
