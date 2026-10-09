import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();
  const timezone =
    "timezone" in session.user && typeof session.user.timezone === "string"
      ? session.user.timezone
      : "Africa/Johannesburg";

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`All accounts · times in ${timezone}`}
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
