import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function PlaybooksPage() {
  return (
    <>
      <PageHeader title="Playbooks" subtitle="Setups you assign to trades" />
      <EmptyState
        title="No playbooks yet"
        body="Create named setups (for example London open breakout) and tag trades with them."
      />
    </>
  );
}
