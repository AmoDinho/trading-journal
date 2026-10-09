import type { EdgeAxes } from "@/lib/edge-score";

const LABELS: { key: keyof EdgeAxes; label: string }[] = [
  { key: "winPct", label: "WIN %" },
  { key: "pf", label: "PF" },
  { key: "avgWL", label: "AVG W/L" },
  { key: "recovery", label: "RECOVERY" },
  { key: "maxDd", label: "MAX DD" },
  { key: "consistency", label: "CONSIST." },
];

export function EdgeScore({
  score,
  axes,
  blurb,
}: {
  score: number;
  axes: EdgeAxes;
  blurb: string;
}) {
  const cx = 90;
  const cy = 90;
  const r = 62;
  const values = LABELS.map((l) => axes[l.key]);
  const points = values.map((v, i) => polar(cx, cy, r * (v / 100), i));
  const grid = [0.33, 0.66, 1].map((s) =>
    LABELS.map((_, i) => polar(cx, cy, r * s, i)).join(" "),
  );

  return (
    <section className="rounded-xl bg-surface p-5 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Edge score</h2>
        <a href="#how-scored" className="text-[13px] text-[#9ec1ff]">
          How it’s scored
        </a>
      </div>
      <div className="mt-2 flex flex-col items-center sm:flex-row sm:items-start sm:gap-4">
        <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0">
          {grid.map((pts) => (
            <polygon
              key={pts}
              points={pts}
              fill="none"
              stroke="#22272f"
              strokeWidth="1"
            />
          ))}
          <polygon
            points={points.join(" ")}
            fill="#6b9eff33"
            stroke="#6b9eff"
            strokeWidth="1.5"
          />
          {LABELS.map((l, i) => {
            const [x, y] = polar(cx, cy, r + 16, i);
            return (
              <text
                key={l.key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#8b919c"
                fontSize="8"
              >
                {l.label}
              </text>
            );
          })}
        </svg>
        <div className="mt-2 sm:mt-6">
          <p className="text-[40px] leading-none font-semibold">
            {score} <span className="text-[16px] font-normal text-faint">/ 100</span>
          </p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-[#6b9eff]" style={{ width: `${score}%` }} />
          </div>
          <p id="how-scored" className="mt-3 max-w-xs text-[12.5px] text-faint">
            {blurb} Win % is 40% of the score. PF and avg win/loss only count
            when each is at least 1.8.
          </p>
        </div>
      </div>
    </section>
  );
}

function polar(cx: number, cy: number, radius: number, i: number) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  return `${cx + radius * Math.cos(a)},${cy + radius * Math.sin(a)}`;
}
