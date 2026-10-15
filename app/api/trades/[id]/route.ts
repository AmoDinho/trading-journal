import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { importBatch, playbook, tag, trade, tradeTag } from "@/lib/db/schema";
import { historyVisible } from "@/lib/imports";

const patchSchema = z.object({
  initialStop: z.number().positive().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().optional(),
  playbookId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: trade.id })
    .from(trade)
    .leftJoin(importBatch, eq(trade.importId, importBatch.id))
    .where(
      and(
        eq(trade.id, id),
        eq(trade.userId, session.user.id),
        historyVisible(trade.importId),
      ),
    )
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  if (data.playbookId) {
    const [owned] = await db
      .select({ id: playbook.id })
      .from(playbook)
      .where(
        and(eq(playbook.id, data.playbookId), eq(playbook.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 400 });
    }
  }

  const patch: Partial<typeof trade.$inferInsert> = {};
  if (data.initialStop !== undefined) {
    patch.initialStop = data.initialStop == null ? null : String(data.initialStop);
  }
  if (data.rating !== undefined) patch.rating = data.rating;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.playbookId !== undefined) patch.playbookId = data.playbookId;

  if (Object.keys(patch).length > 0) {
    await db
      .update(trade)
      .set(patch)
      .where(and(eq(trade.id, id), eq(trade.userId, session.user.id)));
  }

  if (data.tagIds) {
    const owned =
      data.tagIds.length === 0
        ? []
        : await db
            .select({ id: tag.id })
            .from(tag)
            .where(eq(tag.userId, session.user.id));
    const ownedSet = new Set(owned.map((t) => t.id));
    if (data.tagIds.some((tagId) => !ownedSet.has(tagId))) {
      return NextResponse.json({ error: "Tag not found" }, { status: 400 });
    }
    await db.delete(tradeTag).where(eq(tradeTag.tradeId, id));
    if (data.tagIds.length > 0) {
      await db.insert(tradeTag).values(
        data.tagIds.map((tagId) => ({ tradeId: id, tagId })),
      );
    }
  }

  return NextResponse.json({ ok: true });
}
