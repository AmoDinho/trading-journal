import Link from "next/link";
import type { WeekRow } from "@/lib/dashboard-stats";
import { formatMasked, moneyClass } from "@/lib/format";

export function CalendarHeatmap({
  label,
  weeks,
  monthNet,
  hide,
  onPrev,
  onNext,
}: {
  label: string;
  weeks: WeekRow[];
  monthNet: number;
  hide: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const maxAbs = Math.max(
    1,
    ...weeks.flatMap((w) => w.days.filter((d) => d.inMonth).map((d) => Math.abs(d.net))),
  );
  const green = weeks.reduce(
    (s, w) => s + w.days.filter((d) => d.inMonth && d.net > 0.005).length,
    0,
  );
  const red = weeks.reduce(
    (s, w) => s + w.days.filter((d) => d.inMonth && d.net < -0.005).length,
    0,
  );

  return (
    <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-lg px-2 py-1 ring-1 ring-line"
          >
            ‹
          </button>
          <h2 className="text-[16px] font-semibold">{label}</h2>
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg px-2 py-1 ring-1 ring-line"
          >
            ›
          </button>
        </div>
        <p className="text-[13px]">
          Month{" "}
          <span className={moneyClass(monthNet)}>{formatMasked(monthNet, hide)}</span>
          <span className="ml-2 text-faint">
            {green} green · {red} red
          </span>
        </p>
      </div>
      <div className="mt-4 grid grid-cols-[repeat(5,minmax(0,1fr))_72px] gap-1.5 text-center text-[11px] tracking-wide text-faint uppercase">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Week"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_72px] gap-1.5">
        {weeks.map((week) => (
          <div key={week.days[0]?.date} className="contents">
            {week.days.map((day) => {
              const intensity = Math.min(1, Math.abs(day.net) / maxAbs);
              const bg =
                !day.inMonth || day.trades === 0
                  ? "transparent"
                  : day.net > 0
                    ? `rgba(61, 207, 142, ${0.18 + intensity * 0.55})`
                    : `rgba(240, 113, 124, ${0.18 + intensity * 0.55})`;
              const inner = (
                <div
                  className={`flex min-h-[72px] flex-col rounded-lg px-2 py-2 text-left ring-1 ring-line ${
                    day.inMonth ? "" : "opacity-30"
                  }`}
                  style={{ background: bg }}
                >
                  <span className="text-[11px] text-faint">{day.day}</span>
                  {day.inMonth && day.trades > 0 ? (
                    <>
                      <span
                        className={`mt-auto text-[13px] font-medium tabular-nums ${moneyClass(day.net)}`}
                      >
                        {formatMasked(day.net, hide)}
                      </span>
                      <span className="text-[11px] text-faint">
                        {day.trades} trade{day.trades === 1 ? "" : "s"}
                      </span>
                    </>
                  ) : null}
                </div>
              );
              return day.inMonth && day.trades > 0 ? (
                <Link key={day.date} href={`/trades?date=${day.date}`}>
                  {inner}
                </Link>
              ) : (
                <div key={day.date}>{inner}</div>
              );
            })}
            <div className="flex min-h-[72px] flex-col rounded-lg bg-canvas px-2 py-2 ring-1 ring-line">
              <span className="text-[11px] text-faint">Week</span>
              <span className={`mt-auto text-[13px] font-medium tabular-nums ${moneyClass(week.weekNet)}`}>
                {formatMasked(week.weekNet, hide)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-faint">Darker cell = larger day</p>
    </section>
  );
}
