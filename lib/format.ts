export function formatMoney(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `-$${abs}`;
  if (value > 0) return `+$${abs}`;
  return `$${abs}`;
}

export function moneyClass(value: number): string {
  if (value < 0) return "text-loss";
  if (value > 0) return "text-profit";
  return "text-fg";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatParsedMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatRange(from: string | null, to: string | null): string {
  if (!from || !to) return "";
  const a = new Date(from);
  const b = new Date(to);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(a)} – ${fmt(b)} · server time`;
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const min = Math.round(delta / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 48) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function formatCloseTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const EXIT_LABEL: Record<string, string> = {
  stop_out: "Stop-out",
  stop_loss: "Stop loss",
  take_profit: "Take profit",
  manual: "Manual",
};
