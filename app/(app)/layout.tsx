import { and, count, desc, eq, isNull } from "drizzle-orm";
import { Sidebar } from "@/components/sidebar";
import { db } from "@/lib/db";
import { cashFlow, importBatch, trade, tradingAccount } from "@/lib/db/schema";
import { historyVisible } from "@/lib/imports";
import { requireSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  const [account] = await db
    .select()
    .from(tradingAccount)
    .where(eq(tradingAccount.userId, session.user.id))
    .limit(1);

  const [latest] = await db
    .select()
    .from(importBatch)
    .where(
      and(eq(importBatch.userId, session.user.id), isNull(importBatch.deletedAt)),
    )
    .orderBy(desc(importBatch.createdAt))
    .limit(1);

  const [tradeCount] = latest
    ? await db
        .select({ n: count() })
        .from(trade)
        .leftJoin(importBatch, eq(trade.importId, importBatch.id))
        .where(and(eq(trade.userId, session.user.id), historyVisible(trade.importId)))
    : [{ n: 0 }];
  const [flowCount] = latest
    ? await db
        .select({ n: count() })
        .from(cashFlow)
        .leftJoin(importBatch, eq(cashFlow.importId, importBatch.id))
        .where(
          and(eq(cashFlow.userId, session.user.id), historyVisible(cashFlow.importId)),
        )
    : [{ n: 0 }];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        accountName={account?.name ?? "Personal"}
        lastImport={
          latest
            ? {
                when: latest.createdAt.toISOString(),
                trades: Number(tradeCount.n),
                cashFlows: Number(flowCount.n),
              }
            : null
        }
      />
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
