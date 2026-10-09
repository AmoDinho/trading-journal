import { count, desc, eq } from "drizzle-orm";
import { Sidebar } from "@/components/sidebar";
import { db } from "@/lib/db";
import { cashFlow, importBatch, trade, tradingAccount } from "@/lib/db/schema";
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
    .where(eq(importBatch.userId, session.user.id))
    .orderBy(desc(importBatch.createdAt))
    .limit(1);

  const [tradeCount] = latest
    ? await db
        .select({ n: count() })
        .from(trade)
        .where(eq(trade.userId, session.user.id))
    : [{ n: 0 }];
  const [flowCount] = latest
    ? await db
        .select({ n: count() })
        .from(cashFlow)
        .where(eq(cashFlow.userId, session.user.id))
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
