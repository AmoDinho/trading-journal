"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TIMEZONES = [
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "Asia/Tokyo",
  "UTC",
];

export function SettingsForm({
  timezone,
}: {
  timezone: string;
}) {
  const router = useRouter();
  const [tz, setTz] = useState(timezone);
  const [name, setName] = useState("");
  const [serverTz, setServerTz] = useState("GMT+2/+3");
  const [currency, setCurrency] = useState("USD");

  return (
    <div className="mt-4 space-y-4">
      <label className="block text-[13.5px]">
        <span className="text-faint">Timezone</span>
        <select
          value={tz}
          onChange={async (e) => {
            setTz(e.target.value);
            await fetch("/api/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ timezone: e.target.value }),
            });
            router.refresh();
          }}
          className="mt-1 w-full rounded-lg bg-canvas px-3 py-2 ring-1 ring-line"
        >
          {TIMEZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>

      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              serverTz,
              currency,
            }),
          });
          setName("");
          router.refresh();
        }}
      >
        <p className="text-[12px] text-faint">Add account</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prop challenge"
          className="w-full rounded-lg bg-canvas px-3 py-2 text-[13.5px] ring-1 ring-line"
        />
        <div className="flex gap-2">
          <input
            value={serverTz}
            onChange={(e) => setServerTz(e.target.value)}
            className="w-full rounded-lg bg-canvas px-3 py-2 text-[13.5px] ring-1 ring-line"
          />
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-24 rounded-lg bg-canvas px-3 py-2 text-[13.5px] ring-1 ring-line"
          />
          <button
            type="submit"
            className="rounded-lg bg-fg px-3 py-2 text-[13.5px] font-medium text-canvas"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
