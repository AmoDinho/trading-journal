import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { playbook } from "@/lib/db/schema";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
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
    .insert(playbook)
    .values({ userId: session.user.id, name: parsed.data.name })
    .returning();
  return NextResponse.json(row);
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(playbook)
    .where(eq(playbook.userId, session.user.id));
  return NextResponse.json(rows);
}
