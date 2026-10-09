type IconProps = { className?: string };

function Icon({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  );
}

export function TradesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  );
}

export function JournalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Icon>
  );
}

export function ReportsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </Icon>
  );
}

export function PlaybooksIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="11" cy="17" r="1.6" fill="currentColor" stroke="none" />
    </Icon>
  );
}
