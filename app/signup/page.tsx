"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <Logo />
        <h1 className="mt-8 text-[28px] font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="mt-1 text-[13.5px] text-faint">
          A Personal trading account is created for you.
        </p>
        <form
          className="mt-8 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const form = new FormData(event.currentTarget);
            const { error: result } = await authClient.signUp.email({
              name: String(form.get("name") ?? ""),
              email: String(form.get("email") ?? ""),
              password: String(form.get("password") ?? ""),
            });
            setPending(false);
            if (result) {
              setError(result.message ?? "Could not create account");
              return;
            }
            router.push("/");
            router.refresh();
          }}
        >
          <label className="block">
            <span className="text-[12px] text-faint">Name</span>
            <input
              name="name"
              type="text"
              required
              autoComplete="name"
              className="mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-line focus:ring-faint"
            />
          </label>
          <label className="block">
            <span className="text-[12px] text-faint">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-line focus:ring-faint"
            />
          </label>
          <label className="block">
            <span className="text-[12px] text-faint">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-line focus:ring-faint"
            />
          </label>
          {error ? <p className="text-[13px] text-loss">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-fg py-2.5 text-[14px] font-medium text-canvas disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-[13.5px] text-faint">
          Already have an account?{" "}
          <Link href="/login" className="text-fg underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
