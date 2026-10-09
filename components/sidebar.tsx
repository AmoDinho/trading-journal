"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  DashboardIcon,
  ImportIcon,
  JournalIcon,
  PlaybooksIcon,
  ReportsIcon,
  SettingsIcon,
  TradesIcon,
} from "@/components/icons";
import { formatRelative } from "@/lib/format";

const nav = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/trades", label: "Trades", icon: TradesIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
  { href: "/playbooks", label: "Playbooks", icon: PlaybooksIcon },
  { href: "/import", label: "Import", icon: ImportIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({
  accountName,
  lastImport,
}: {
  accountName: string;
  lastImport: { when: string; trades: number; cashFlows: number } | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-line bg-ink">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                active
                  ? "bg-surface text-fg"
                  : "text-faint hover:bg-surface/60 hover:text-fg"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <div className="rounded-lg bg-surface px-3 py-2.5 ring-1 ring-line">
          <p className="text-[10px] font-medium tracking-wider text-faint uppercase">
            Last import
          </p>
          <p className="mt-1 text-[13px] text-fg">
            {accountName} · {lastImport ? formatRelative(lastImport.when) : "never"}
          </p>
          <p className="text-[12px] text-faint">
            {lastImport
              ? `${lastImport.trades} positions · ${lastImport.cashFlows} cash flows`
              : "No reports yet"}
          </p>
        </div>
      </div>
    </aside>
  );
}
