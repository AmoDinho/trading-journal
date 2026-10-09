import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Dashboard } from "@/components/dashboard/dashboard";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { loadTradeLog } from "@/lib/trade-query";

export default async function DashboardPage() {
  const session = await requireSession();
  const timeZone =
    "timezone" in session.user && typeof session.user.timezone === "string"
      ? session.user.timezone
      : "Africa/Johannesburg";
  const { trades, accounts, playbooks, tags } = await loadTradeLog(
    session.user.id,
  );

  if (trades.length === 0) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle={`All accounts · times in ${timeZone}`}
          action={
            <Link
              href="/import"
              className="inline-flex items-center gap-2 rounded-lg bg-fg px-3.5 py-2 text-[13.5px] font-medium text-canvas"
            >
              Import MT5 report
            </Link>
          }
        />
        <EmptyState
          title="No trades yet"
          body="Import a MetaTrader 5 history report to see P&L, the calendar, and recent trades."
        />
      </>
    );
  }

  return (
    <Dashboard
      trades={trades}
      accounts={accounts}
      playbooks={playbooks}
      tags={tags}
      timeZone={timeZone}
    />
  );
}
