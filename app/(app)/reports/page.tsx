import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function ReportsPage() {
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
