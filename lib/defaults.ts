import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { playbook, tag } from "@/lib/db/schema";

const DEFAULT_TAGS: { category: string; name: string }[] = [
  { category: "setup", name: "Breakout" },
  { category: "setup", name: "Reversal" },
  { category: "setup", name: "FOMO" },
  { category: "mistakes", name: "Oversized" },
  { category: "mistakes", name: "No stop" },
  { category: "emotions", name: "Frustrated" },
];

export async function ensureJournalDefaults(userId: string) {
  const [existingPlaybook] = await db
    .select({ id: playbook.id })
    .from(playbook)
    .where(eq(playbook.userId, userId))
    .limit(1);

  if (!existingPlaybook) {
    await db.insert(playbook).values({
      userId,
      name: "London open breakout",
    });
  }

  const existingTags = await db
    .select({ name: tag.name, category: tag.category })
    .from(tag)
    .where(eq(tag.userId, userId));
  const have = new Set(existingTags.map((t) => `${t.category}:${t.name}`));
  const missing = DEFAULT_TAGS.filter((t) => !have.has(`${t.category}:${t.name}`));
  if (missing.length > 0) {
    await db.insert(tag).values(missing.map((t) => ({ ...t, userId })));
  }
}
