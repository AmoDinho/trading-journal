const styles: Record<string, string> = {
  setup: "bg-[#3d5a80]/40 text-[#9ec1ff]",
  mistakes: "bg-loss/15 text-loss",
  emotions: "bg-amber/15 text-amber",
};

export function TagChip({
  category,
  name,
  onClick,
}: {
  category: string;
  name: string;
  onClick?: () => void;
}) {
  const className = `rounded-md px-2 py-0.5 text-[12px] font-medium ${styles[category] ?? "bg-surface-hover text-faint"}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {name}
      </button>
    );
  }
  return <span className={className}>{name}</span>;
}
