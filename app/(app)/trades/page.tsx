import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TradeLog } from "@/components/trades/trade-log";
import { ensureJournalDefaults } from "@/lib/defaults";
import { requireSession } from "@/lib/session";
import { loadTradeLog } from "@/lib/trade-query";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireSession();
  const { date } = await searchParams;
  await ensureJournalDefaults(session.user.id);
  const { trades, accounts, playbooks, tags } = await loadTradeLog(session.user.id);
  const timeZone =
    "timezone" in session.user && typeof session.user.timezone === "string"
      ? session.user.timezone
      : "Africa/Johannesburg";

  if (trades.length === 0) {
    return (
      <>
        <PageHeader title="Trade log" subtitle="0 of 0 trades" />
        <EmptyState
          title="The log is empty"
          body="Closed positions will show up here after you import an MT5 report."
        />
      </>
    );
  }

  return (
    <TradeLog
      trades={trades}
      accounts={accounts}
      playbooks={playbooks}
      tags={tags}
      timeZone={timeZone}
      initialDate={date ?? ""}
    />
  );
}
