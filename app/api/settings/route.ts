import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

const bodySchema = z.object({
  timezone: z.string().trim().min(1).max(64),
});

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  await db
    .update(user)
    .set({ timezone: parsed.data.timezone })
    .where(eq(user.id, session.user.id));
  return NextResponse.json({ ok: true, timezone: parsed.data.timezone });
}
