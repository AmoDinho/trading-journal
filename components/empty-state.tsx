export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mt-6 rounded-xl bg-surface px-6 py-16 text-center ring-1 ring-line">
      <p className="text-[15px] font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] text-faint">{body}</p>
    </div>
  );
}
