import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOwnedAccount, previewImport } from "@/lib/imports";
import { importPayloadSchema } from "@/lib/mt5/payload";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = importPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const account = await getOwnedAccount(
    session.user.id,
    parsed.data.accountId,
  );
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const diff = await previewImport(
    session.user.id,
    parsed.data.accountId,
    parsed.data.trades,
    parsed.data.cashFlows,
  );

  return NextResponse.json({
    positionsInFile: parsed.data.trades.length,
    newTrades: diff.newTrades.length + diff.restoredTradeIds.length,
    alreadyImported: diff.alreadyImported,
    newCashFlows: diff.newCashFlows.length + diff.restoredFlowIds.length,
  });
}
