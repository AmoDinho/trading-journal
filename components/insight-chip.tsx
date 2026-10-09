import { INSIGHT_LABEL, type InsightId } from "@/lib/insights";

export function InsightChip({ id }: { id: InsightId }) {
  const leak =
    id === "margin_stop_out" ||
    id === "revenge_trade" ||
    id === "unusual_size" ||
    id === "no_stop_loss" ||
    id === "held_loser_too_long";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${
        leak ? "bg-amber/15 text-amber" : "bg-[#3d5a80]/40 text-[#9ec1ff]"
      }`}
    >
      {INSIGHT_LABEL[id]}
    </span>
  );
}
