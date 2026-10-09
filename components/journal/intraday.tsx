import type { TradeRow } from "@/lib/trade-query";

export function IntradayChart({ trades }: { trades: TradeRow[] }) {
  if (trades.length === 0) return null;
  const sorted = [...trades].sort(
    (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime(),
  );
  const start = new Date(sorted[0]!.openTime).getTime();
  const end = new Date(sorted[sorted.length - 1]!.closeTime).getTime();
  const span = Math.max(1, end - start);
  const points: { x: number; y: number; t: number; net: number }[] = [
    { x: 0, y: 0, t: start, net: 0 },
  ];
  let equity = 0;
  for (const t of sorted) {
    equity += t.net;
    const x = (new Date(t.closeTime).getTime() - start) / span;
    points.push({ x, y: equity, t: new Date(t.closeTime).getTime(), net: t.net });
  }

  const w = 640;
  const h = 160;
  const ys = points.map((p) => p.y);
  const min = Math.min(0, ...ys);
  const max = Math.max(0, ...ys);
  const pad = (max - min) * 0.15 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const X = (x: number) => x * w;
  const Y = (v: number) => h - ((v - yMin) / (yMax - yMin)) * h;
  const zero = Y(0);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`)
    .join(" ");
  const markers = sorted.filter((t) => t.exitReason === "stop_out");

  function label(ms: number) {
    return new Date(ms).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none">
        <line x1="0" y1={zero} x2={w} y2={zero} stroke="#22272f" strokeWidth="1" />
        <path d={`${d} L${w},${zero} L0,${zero} Z`} fill="#6b9eff22" />
        <path d={d} fill="none" stroke="#6b9eff" strokeWidth="2" />
        {markers.map((t) => {
          const x = X((new Date(t.closeTime).getTime() - start) / span);
          return (
            <line
              key={t.id}
              x1={x}
              y1="0"
              x2={x}
              y2={h}
              stroke="#e8b86d"
              strokeDasharray="3 3"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-faint">
        <span>{label(start)}</span>
        {markers[0] ? (
          <span className="text-amber">
            {label(new Date(markers[0].closeTime).getTime())} stop-out
          </span>
        ) : (
          <span />
        )}
        <span>{label(end)}</span>
      </div>
    </div>
  );
}
