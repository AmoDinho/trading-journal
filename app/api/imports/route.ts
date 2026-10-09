import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { commitImport, getOwnedAccount } from "@/lib/imports";
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

  const result = await commitImport(session.user.id, parsed.data);
  return NextResponse.json({
    importId: result.batch.id,
    newTrades: result.newTrades,
    alreadyImported: result.alreadyImported,
    newCashFlows: result.newCashFlows,
  });
}
