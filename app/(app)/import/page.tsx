import { and, desc, eq, isNull } from "drizzle-orm";
import { ImportWizard } from "@/components/import/wizard";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { importBatch, tradingAccount } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";

export default async function ImportPage() {
  const session = await requireSession();
  const accounts = await db
    .select({
      id: tradingAccount.id,
      name: tradingAccount.name,
      serverTz: tradingAccount.serverTz,
      currency: tradingAccount.currency,
    })
    .from(tradingAccount)
    .where(eq(tradingAccount.userId, session.user.id));

  const pastImports = await db
    .select({
      id: importBatch.id,
      accountId: importBatch.accountId,
      createdAt: importBatch.createdAt,
      filename: importBatch.filename,
      format: importBatch.format,
      positionsInFile: importBatch.positionsInFile,
      newTrades: importBatch.newTrades,
      warnings: importBatch.warnings,
    })
    .from(importBatch)
    .where(
      and(eq(importBatch.userId, session.user.id), isNull(importBatch.deletedAt)),
    )
    .orderBy(desc(importBatch.createdAt))
    .limit(20);

  return (
    <>
      <PageHeader
        title="Import MT5 report"
        subtitle="Your file is read in this browser. Only trade rows are uploaded."
      />
      <ImportWizard
        accounts={accounts}
        pastImports={pastImports.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
