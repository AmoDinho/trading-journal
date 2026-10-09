import { PlaybooksView } from "@/components/playbooks/playbooks-view";
import { ensureJournalDefaults } from "@/lib/defaults";
import { requireSession } from "@/lib/session";
import { loadTradeLog } from "@/lib/trade-query";

export default async function PlaybooksPage() {
  const session = await requireSession();
  await ensureJournalDefaults(session.user.id);
  const { trades, playbooks } = await loadTradeLog(session.user.id);

  const rows = playbooks.map((p) => {
    const subset = trades.filter((t) => t.playbookId === p.id);
    const wins = subset.filter((t) => t.net > 0.005).length;
    const decided = subset.filter((t) => Math.abs(t.net) > 0.005).length;
    return {
      id: p.id,
      name: p.name,
      trades: subset.length,
      net: subset.reduce((s, t) => s + t.net, 0),
      winPct: decided === 0 ? 0 : (wins / decided) * 100,
    };
  });

  return <PlaybooksView rows={rows} />;
}
