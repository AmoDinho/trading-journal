import type { EquityPoint } from "@/lib/dashboard-stats";

export function EquityChart({
  points,
  hide,
}: {
  points: EquityPoint[];
  hide: boolean;
}) {
  const series = points.length > 1 ? points : [{ t: 0, equity: 0, drawdown: 0 }, ...points];
  const w = 640;
  const h = 160;
  const values = series.map((p) => p.equity);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = (max - min) * 0.12 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const x = (i: number) => (i / Math.max(1, series.length - 1)) * w;
  const y = (v: number) => h - ((v - yMin) / (yMax - yMin)) * h;
  const zero = y(0);
  const line = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.equity).toFixed(1)}`)
    .join(" ");
  const fill = `${line} L${w},${zero} L0,${zero} Z`;
  const positive = (series[series.length - 1]?.equity ?? 0) >= 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none">
      <line x1="0" y1={zero} x2={w} y2={zero} stroke="#22272f" strokeWidth="1" />
      <path d={fill} fill={positive ? "#3dcf8e22" : "#f0717c22"} />
      <path
        d={line}
        fill="none"
        stroke={hide ? "#8b919c" : "#6b9eff"}
        strokeWidth="2"
      />
    </svg>
  );
}

export function DrawdownChart({ points }: { points: EquityPoint[] }) {
  const series = points.length > 1 ? points : [{ t: 0, equity: 0, drawdown: 0 }, ...points];
  const w = 640;
  const h = 72;
  const min = Math.min(0, ...series.map((p) => p.drawdown));
  const yMin = min * 1.15 || -1;
  const x = (i: number) => (i / Math.max(1, series.length - 1)) * w;
  const y = (v: number) => (v / yMin) * h;
  const line = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.drawdown).toFixed(1)}`)
    .join(" ");
  const fill = `${line} L${w},0 L0,0 Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[72px] w-full" preserveAspectRatio="none">
      <path d={fill} fill="#f0717c33" />
      <path d={line} fill="none" stroke="#f0717c" strokeWidth="1.5" />
    </svg>
  );
}

export function DailyBars({
  days,
  hide,
}: {
  days: { date: string; net: number }[];
  hide: boolean;
}) {
  const max = Math.max(1, ...days.map((d) => Math.abs(d.net)));
  return (
    <div className="flex h-36 items-end gap-[3px]">
      {days.map((d) => {
        const h = Math.max(2, (Math.abs(d.net) / max) * 100);
        return (
          <div
            key={d.date}
            title={hide ? undefined : `${d.date} ${d.net}`}
            className={`min-w-0 flex-1 rounded-sm ${
              d.net > 0 ? "bg-profit" : d.net < 0 ? "bg-loss" : "bg-line"
            }`}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}
