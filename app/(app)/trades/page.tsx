import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function TradesPage() {
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
