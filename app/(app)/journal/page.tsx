import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function JournalPage() {
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
