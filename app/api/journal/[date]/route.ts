import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalEntry } from "@/lib/db/schema";

const bodySchema = z.object({
  plan: z.string().optional(),
  happened: z.string().optional(),
  lessons: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await context.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(journalEntry)
    .where(
      and(eq(journalEntry.userId, session.user.id), eq(journalEntry.date, date)),
    )
    .limit(1);

  const patch = {
    plan: parsed.data.plan ?? existing?.plan ?? "",
    happened: parsed.data.happened ?? existing?.happened ?? "",
    lessons: parsed.data.lessons ?? existing?.lessons ?? "",
  };

  const [row] = existing
    ? await db
        .update(journalEntry)
        .set(patch)
        .where(eq(journalEntry.id, existing.id))
        .returning()
    : await db
        .insert(journalEntry)
        .values({ userId: session.user.id, date, ...patch })
        .returning();

  return NextResponse.json({
    date: row!.date,
    plan: row!.plan,
    happened: row!.happened,
    lessons: row!.lessons,
    updatedAt: row!.updatedAt.toISOString(),
  });
}
