import { dashboardKpis, equityMeta, equitySeries } from "@/lib/dashboard-stats";
import type { TradeRow } from "@/lib/trade-query";

export type EdgeAxes = {
  winPct: number;
  pf: number;
  avgWL: number;
  recovery: number;
  maxDd: number;
  consistency: number;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

export function edgeScore(trades: TradeRow[], timeZone: string) {
  const kpis = dashboardKpis(trades, timeZone);
  const { peak, maxDrawdown } = equityMeta(equitySeries(trades));
  const negative = kpis.net < 0;

  const axes: EdgeAxes = {
    winPct: clamp(kpis.winPct),
    pf: kpis.pf < 1.8 ? clamp((kpis.pf / 1.8) * 35) : clamp(50 + ((kpis.pf - 1.8) / 2) * 50),
    avgWL:
      kpis.avgWinLoss < 1.8
        ? clamp((kpis.avgWinLoss / 1.8) * 35)
        : clamp(50 + ((kpis.avgWinLoss - 1.8) / 2) * 50),
    recovery: negative ? 0 : clamp(100 + (maxDrawdown / Math.max(1, peak)) * 100),
    maxDd: negative ? 0 : clamp(100 + (maxDrawdown / Math.max(1, peak)) * 120),
    consistency: negative ? 0 : clamp(kpis.dayWinPct),
  };

  const pfContrib = kpis.pf < 1.8 ? 0 : axes.pf;
  const wlContrib = kpis.avgWinLoss < 1.8 ? 0 : axes.avgWL;
  const score = Math.round(
    0.4 * axes.winPct +
      0.15 * pfContrib +
      0.15 * wlContrib +
      0.1 * axes.recovery +
      0.1 * axes.maxDd +
      0.1 * axes.consistency,
  );

  let blurb = "Win rate is carrying the score.";
  if (kpis.pf < 1.8 && kpis.avgWinLoss < 1.8) {
    blurb += " Profit factor and avg win/loss sit under 1.8";
    if (negative) blurb += ", and net is negative, so recovery, drawdown and consistency score 0.";
    else blurb += ".";
  } else if (negative) {
    blurb += " Net is negative, so recovery, drawdown and consistency score 0.";
  }

  return { score: clamp(score), axes, blurb };
}
