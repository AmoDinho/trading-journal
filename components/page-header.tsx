export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[13.5px] text-faint">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
