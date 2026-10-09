import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { db } from "@/lib/db";
import { tradingAccount } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const accounts = await db
    .select()
    .from(tradingAccount)
    .where(eq(tradingAccount.userId, session.user.id));
  const timezone =
    "timezone" in session.user && typeof session.user.timezone === "string"
      ? session.user.timezone
      : "Africa/Johannesburg";

  return (
    <>
      <PageHeader title="Settings" action={<SignOutButton />} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
          <h2 className="text-[13px] font-medium tracking-wide text-faint uppercase">
            Profile
          </h2>
          <dl className="mt-4 space-y-3 text-[14px]">
            <div>
              <dt className="text-faint">Name</dt>
              <dd className="mt-0.5">{session.user.name}</dd>
            </div>
            <div>
              <dt className="text-faint">Email</dt>
              <dd className="mt-0.5">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-faint">Timezone</dt>
              <dd className="mt-0.5">{timezone}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
          <h2 className="text-[13px] font-medium tracking-wide text-faint uppercase">
            Accounts
          </h2>
          <ul className="mt-4 space-y-3">
            {accounts.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between text-[14px]"
              >
                <span>{item.name}</span>
                <span className="text-faint">
                  {item.currency} · server {item.serverTz}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
