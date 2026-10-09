import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { playbook, trade } from "@/lib/db/schema";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80),
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
  const [row] = await db
    .update(playbook)
    .set({ name: parsed.data.name })
    .where(and(eq(playbook.id, id), eq(playbook.userId, session.user.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  await db
    .update(trade)
    .set({ playbookId: null })
    .where(and(eq(trade.playbookId, id), eq(trade.userId, session.user.id)));
  await db
    .delete(playbook)
    .where(and(eq(playbook.id, id), eq(playbook.userId, session.user.id)));
  return NextResponse.json({ ok: true });
}
