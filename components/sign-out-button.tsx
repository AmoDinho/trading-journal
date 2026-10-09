"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-lg bg-surface px-3.5 py-2 text-[13.5px] font-medium ring-1 ring-line hover:bg-surface-hover"
    >
      Sign out
    </button>
  );
}
