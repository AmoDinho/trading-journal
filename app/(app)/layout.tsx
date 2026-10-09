import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/sidebar";
import { db } from "@/lib/db";
import { tradingAccount } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  const [account] = await db
    .select()
    .from(tradingAccount)
    .where(eq(tradingAccount.userId, session.user.id))
    .limit(1);

  return (
    <div className="flex min-h-screen">
      <Sidebar accountName={account?.name ?? "Personal"} />
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
