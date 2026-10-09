"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  formatBytes,
  formatMoney,
  formatParsedMs,
  formatRange,
  formatWhen,
  moneyClass,
} from "@/lib/format";
import { parseMt5File } from "@/lib/mt5/parse-file";
import { warningText, type FileMeta, type ParsedReport } from "@/lib/mt5/types";

type Account = {
  id: string;
  name: string;
  serverTz: string;
  currency: string;
};

type PastImport = {
  id: string;
  createdAt: string;
  filename: string;
  format: string;
  positionsInFile: number;
  newTrades: number;
  warnings: number;
};

type PreviewCounts = {
  positionsInFile: number;
  newTrades: number;
  alreadyImported: number;
  newCashFlows: number;
};

export function ImportWizard({
  accounts,
  pastImports,
}: {
  accounts: Account[];
  pastImports: PastImport[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<{
    report: ParsedReport;
    meta: FileMeta;
    counts: PreviewCounts;
  } | null>(null);

  const account = accounts.find((a) => a.id === accountId);
  const net = useMemo(() => {
    if (!parsed) return 0;
    return parsed.report.trades.reduce((s, t) => s + t.profit, 0);
  }, [parsed]);

  const exits = useMemo(() => {
    const c = { stop_out: 0, stop_loss: 0, take_profit: 0, manual: 0 };
    if (!parsed) return c;
    for (const t of parsed.report.trades) c[t.exitReason] += 1;
    return c;
  }, [parsed]);

  const deposits = parsed?.report.cashFlows.filter((c) => c.type === "deposit").length ?? 0;
  const withdrawals =
    parsed?.report.cashFlows.filter((c) => c.type === "withdrawal").length ?? 0;
  const matches =
    parsed?.report.reportNetProfit != null &&
    Math.abs(net - parsed.report.reportNetProfit) < 0.015;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const result = await parseMt5File(file);
      const payload = {
        accountId,
        meta: result.meta,
        reportNetProfit: result.report.reportNetProfit,
        trades: result.report.trades,
        cashFlows: result.report.cashFlows,
        warnings: result.report.warnings,
      };
      const res = await fetch("/api/imports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Could not preview import");
      const counts = (await res.json()) as PreviewCounts;
      setParsed({ ...result, counts });
    } catch (err) {
      setParsed(null);
      setError(err instanceof Error ? err.message : "Could not read file");
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          meta: parsed.meta,
          reportNetProfit: parsed.report.reportNetProfit,
          trades: parsed.report.trades,
          cashFlows: parsed.report.cashFlows,
          warnings: parsed.report.warnings,
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      setParsed(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const step = parsed ? 2 : 1;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <ol className="mb-6 flex gap-2 text-[13px]">
          {["Choose file", "Preview", "Import"].map((label, i) => {
            const n = i + 1;
            const done = n < step || (n === 1 && parsed);
            const active = n === step;
            return (
              <li
                key={label}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ring-line ${
                  active ? "bg-surface text-fg" : done ? "text-profit" : "text-faint"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    done ? "bg-profit text-canvas" : active ? "bg-fg text-canvas" : "bg-surface"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        {!parsed ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || !accountId}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center hover:bg-surface"
          >
            <p className="text-[15px] font-medium">
              {busy ? "Reading file…" : "Choose an MT5 history report"}
            </p>
            <p className="mt-2 text-[13.5px] text-faint">
              .xlsx, .csv or .html · up to 20 MB. Header block is skipped.
            </p>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <div>
                <p className="text-[14px] font-medium">
                  History report · {parsed.meta.format.toUpperCase()} detected
                </p>
                <p className="text-[12.5px] text-faint">
                  {formatBytes(parsed.meta.size)} · parsed in{" "}
                  {formatParsedMs(parsed.meta.parsedMs)} · header block skipped, no
                  login or holder name read
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParsed(null);
                  inputRef.current?.click();
                }}
                className="rounded-lg px-3 py-1.5 text-[13px] ring-1 ring-line hover:bg-surface-hover"
              >
                Choose another file
              </button>
            </div>

            <div className="rounded-xl bg-surface p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-[13.5px]">
                  <span className="mr-2 text-faint">Import into account</span>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="rounded-lg bg-canvas px-3 py-1.5 ring-1 ring-line"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · server {a.serverTz}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-[12.5px] text-faint">
                  {formatRange(parsed.report.from, parsed.report.to)}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Positions in file" value={String(parsed.counts.positionsInFile)} />
                <Stat
                  label="New trades"
                  value={String(parsed.counts.newTrades)}
                  accent={parsed.counts.newTrades > 0}
                />
                <Stat
                  label="Already imported"
                  value={String(parsed.counts.alreadyImported)}
                />
                <Stat
                  label="New cash flows"
                  value={String(parsed.counts.newCashFlows)}
                />
              </div>

              <dl className="mt-5 space-y-3 text-[13.5px]">
                <Row
                  label="Net profit of all positions"
                  value={
                    <span className={moneyClass(net)}>{formatMoney(net)}</span>
                  }
                />
                <Row
                  label="Report's Total Net Profit"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={moneyClass(parsed.report.reportNetProfit ?? 0)}
                      >
                        {parsed.report.reportNetProfit == null
                          ? "—"
                          : formatMoney(parsed.report.reportNetProfit)}
                      </span>
                      {matches ? (
                        <span className="rounded-md bg-profit/15 px-2 py-0.5 text-[12px] text-profit">
                          Matches
                        </span>
                      ) : null}
                    </span>
                  }
                />
                <Row
                  label="Exit reasons read from deals"
                  value={`${exits.stop_out} stop-out · ${exits.stop_loss} stop loss · ${exits.take_profit} take profit · ${exits.manual} manual`}
                />
                <Row
                  label="Cash flows"
                  value={`${deposits} deposit · ${withdrawals} withdrawal`}
                />
                <Row
                  label="Ignored"
                  value={`${parsed.report.openPositions} open positions · ${parsed.report.workingOrders} working order`}
                />
              </dl>

              {parsed.report.warnings.length > 0 ? (
                <div className="mt-4 rounded-lg bg-amber/10 px-3 py-2 text-[13px] text-amber">
                  {parsed.report.warnings.length} warning:{" "}
                  {parsed.report.warnings.map(warningText).join(" ")}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onImport}
                  disabled={busy || parsed.counts.newTrades + parsed.counts.newCashFlows === 0}
                  className="rounded-lg bg-fg px-4 py-2 text-[13.5px] font-medium text-canvas disabled:opacity-50"
                >
                  {busy
                    ? "Importing…"
                    : `Import ${parsed.counts.newTrades} trades and ${parsed.counts.newCashFlows} cash flows`}
                </button>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="rounded-lg px-4 py-2 text-[13.5px] ring-1 ring-line"
                >
                  Cancel
                </button>
                <p className="text-[12.5px] text-faint">
                  Notes, tags and ratings on existing trades are never touched.
                </p>
              </div>
            </div>
          </div>
        )}

        {error ? <p className="mt-3 text-[13px] text-loss">{error}</p> : null}

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt,.html,.htm,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void onFile(file);
          }}
        />

        <section className="mt-8">
          <h2 className="text-[16px] font-semibold">Past imports</h2>
          {pastImports.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-faint">None yet.</p>
          ) : (
            <table className="mt-3 w-full text-left text-[13px]">
              <thead className="text-[11px] tracking-wide text-faint uppercase">
                <tr>
                  <th className="py-2 font-medium">When</th>
                  <th className="font-medium">Account</th>
                  <th className="font-medium">Format</th>
                  <th className="font-medium">In file</th>
                  <th className="font-medium">New</th>
                  <th className="font-medium">Warnings</th>
                </tr>
              </thead>
              <tbody>
                {pastImports.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-2.5">{formatWhen(row.createdAt)}</td>
                    <td>{account?.name ?? "Personal"}</td>
                    <td>{row.format.toUpperCase()}</td>
                    <td>{row.positionsInFile}</td>
                    <td>{row.newTrades}</td>
                    <td>{row.warnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-xl bg-surface p-5 ring-1 ring-line">
        <h2 className="text-[15px] font-semibold">Export from MetaTrader 5</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13.5px] text-faint">
          <li>
            Open the Toolbox and go to the <span className="text-fg">History</span> tab.
          </li>
          <li>
            Right-click, choose <span className="text-fg">Positions</span>, then set
            the period to <span className="text-fg">All history</span>.
          </li>
          <li>
            Right-click again, choose <span className="text-fg">Report</span>, and
            save as Excel or HTML.
          </li>
        </ol>
        <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-[12.5px] text-faint">
          Re-importing overlapping reports is safe: duplicates are skipped by
          position id.
        </p>
        <p className="mt-3 text-[12.5px] text-faint">
          Terminal must be in English. .xlsx, .csv and .html up to 20 MB.
        </p>
      </aside>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-3 ring-1 ${
        accent ? "bg-profit/10 ring-profit/30" : "bg-canvas ring-line"
      }`}
    >
      <p className="text-[12px] text-faint">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold ${accent ? "text-profit" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-faint">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
