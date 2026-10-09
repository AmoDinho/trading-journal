import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { InsightsReport } from "@/components/reports/insights";
import { requireSession } from "@/lib/session";
import { loadTradeLog } from "@/lib/trade-query";

export default async function ReportsPage() {
  const session = await requireSession();
  const timeZone =
    "timezone" in session.user && typeof session.user.timezone === "string"
      ? session.user.timezone
      : "Africa/Johannesburg";
  const { trades, accounts, playbooks, cashFlows } = await loadTradeLog(
    session.user.id,
  );

  if (trades.length === 0) {
    return (
      <>
        <PageHeader title="Reports" subtitle="All accounts · no trades yet" />
        <EmptyState
          title="Nothing to report"
          body="Insights, symbols, and exit reasons will populate from imported trades."
        />
      </>
    );
  }

  return (
    <InsightsReport
      trades={trades}
      accounts={accounts}
      playbooks={playbooks}
      cashFlows={cashFlows}
      timeZone={timeZone}
    />
  );
}
