import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tag, trade, tradeTag } from "@/lib/db/schema";

const bodySchema = z.object({
  category: z.enum(["setup", "mistakes", "emotions"]),
  name: z.string().trim().min(1).max(40),
  tradeId: z.string().optional(),
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

  const { category, name, tradeId } = parsed.data;
  const [created] = await db
    .insert(tag)
    .values({ userId: session.user.id, category, name })
    .onConflictDoNothing()
    .returning();

  const [row] =
    created != null
      ? [created]
      : await db
          .select()
          .from(tag)
          .where(
            and(
              eq(tag.userId, session.user.id),
              eq(tag.category, category),
              eq(tag.name, name),
            ),
          )
          .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Could not save tag" }, { status: 500 });
  }

  if (tradeId) {
    const [owned] = await db
      .select({ id: trade.id })
      .from(trade)
      .where(and(eq(trade.id, tradeId), eq(trade.userId, session.user.id)))
      .limit(1);
    if (owned) {
      await db
        .insert(tradeTag)
        .values({ tradeId, tagId: row.id })
        .onConflictDoNothing();
    }
  }

  return NextResponse.json(row);
}
