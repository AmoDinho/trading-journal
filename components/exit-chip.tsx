import { EXIT_LABEL } from "@/lib/format";

const styles: Record<string, string> = {
  stop_out: "bg-amber/15 text-amber",
  stop_loss: "bg-loss/15 text-loss",
  take_profit: "bg-profit/15 text-profit",
  manual: "bg-surface-hover text-faint",
};

export function ExitChip({ reason }: { reason: string }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${styles[reason] ?? styles.manual}`}
    >
      {EXIT_LABEL[reason] ?? reason}
    </span>
  );
}
