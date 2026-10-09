export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface ring-1 ring-line">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <rect x="1" y="7" width="3" height="6" rx="0.6" fill="currentColor" />
          <rect x="5.5" y="3" width="3" height="10" rx="0.6" fill="currentColor" />
          <rect x="10" y="1" width="3" height="12" rx="0.6" fill="currentColor" />
        </svg>
      </span>
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-tight">Tradeledger</span>
      ) : null}
    </div>
  );
}
