import { desc, eq } from "drizzle-orm";
import { EmptyState } from "@/components/empty-state";
import { ExitChip } from "@/components/exit-chip";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { trade } from "@/lib/db/schema";
import { formatCloseTime, formatMoney, moneyClass } from "@/lib/format";
import { requireSession } from "@/lib/session";

export default async function TradesPage() {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(trade)
    .where(eq(trade.userId, session.user.id))
    .orderBy(desc(trade.closeTime));

  return (
    <>
      <PageHeader
        title="Trade log"
        subtitle={`${rows.length} of ${rows.length} trades`}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="The log is empty"
          body="Closed positions will show up here after you import an MT5 report."
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-line">
          <table className="w-full text-left text-[13.5px]">
            <thead className="text-[11px] tracking-wide text-faint uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Closed</th>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 font-medium">Vol</th>
                <th className="px-4 py-3 font-medium">Net</th>
                <th className="px-4 py-3 font-medium">Exit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const net =
                  Number(row.profit) + Number(row.commission) + Number(row.swap);
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-faint">
                      {formatCloseTime(row.closeTime.toISOString())}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.symbol}</td>
                    <td className="px-4 py-3 capitalize">{row.side}</td>
                    <td className="px-4 py-3 tabular-nums">{Number(row.volume).toFixed(2)}</td>
                    <td className={`px-4 py-3 tabular-nums ${moneyClass(net)}`}>
                      {formatMoney(net)}
                    </td>
                    <td className="px-4 py-3">
                      <ExitChip reason={row.exitReason} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
