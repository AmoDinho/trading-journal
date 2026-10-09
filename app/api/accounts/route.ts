import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tradingAccount } from "@/lib/db/schema";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(40),
  serverTz: z.string().trim().min(1).max(20).default("GMT+2/+3"),
  currency: z.string().trim().min(1).max(8).default("USD"),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const [row] = await db
    .insert(tradingAccount)
    .values({ userId: session.user.id, ...parsed.data })
    .returning();
  return NextResponse.json(row);
}
