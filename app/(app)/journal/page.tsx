import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { JournalView } from "@/components/journal/journal-view";
import { loadJournal } from "@/lib/journal";
import { requireSession } from "@/lib/session";
import { loadTradeLog } from "@/lib/trade-query";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireSession();
  const { date } = await searchParams;
  const timeZone =
    "timezone" in session.user && typeof session.user.timezone === "string"
      ? session.user.timezone
      : "Africa/Johannesburg";
  const { trades } = await loadTradeLog(session.user.id);
  const { days, tradeFlags } = await loadJournal(
    session.user.id,
    trades,
    timeZone,
  );

  if (days.length === 0) {
    return (
      <>
        <PageHeader title="Journal" subtitle="0 of 0 days written" />
        <EmptyState
          title="No trading days yet"
          body="Day reviews appear once trades are imported. You can write a plan, what happened, and lessons for each day."
        />
      </>
    );
  }

  const selectedDate =
    date && days.some((d) => d.date === date) ? date : days[0]!.date;

  return (
    <JournalView
      days={days}
      tradeFlags={tradeFlags}
      selectedDate={selectedDate}
    />
  );
}
