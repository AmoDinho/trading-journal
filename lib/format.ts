export function formatMoney(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `-$${abs}`;
  if (value > 0) return `+$${abs}`;
  return `$${abs}`;
}

export function formatMasked(value: number, hide: boolean): string {
  return hide ? "••••" : formatMoney(value);
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

export function tradeNet(profit: number, commission: number, swap: number) {
  return profit + commission + swap;
}

export function formatHold(openIso: string, closeIso: string): string {
  const seconds = Math.max(
    0,
    Math.round((new Date(closeIso).getTime() - new Date(openIso).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function rMultiple(
  side: string,
  openPrice: number,
  closePrice: number,
  initialStop: number | null,
): number | null {
  if (initialStop == null) return null;
  const risk = Math.abs(openPrice - initialStop);
  if (risk === 0) return null;
  const move = side === "short" ? openPrice - closePrice : closePrice - openPrice;
  return move / risk;
}

export function formatR(value: number | null): string {
  if (value == null) return "—";
  const abs = Math.abs(value).toFixed(1);
  if (value < 0) return `-${abs}R`;
  if (value > 0) return `+${abs}R`;
  return "0.0R";
}

export function formatPrice(value: number): string {
  if (value >= 100) return value.toFixed(2);
  if (value >= 10) return value.toFixed(3);
  return value.toFixed(5);
}

export function formatVolume(value: number): string {
  return value.toFixed(2);
}

export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatOpened(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
