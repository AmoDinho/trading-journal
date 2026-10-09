import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import MT5 report"
        subtitle="Your file is read in this browser. Only trade rows are uploaded."
      />
      <div className="mt-6 flex gap-2 text-[13px]">
        {["Choose file", "Preview", "Import"].map((step, i) => (
          <span
            key={step}
            className={`rounded-full px-3 py-1.5 ring-1 ring-line ${
              i === 0 ? "bg-surface text-fg" : "text-faint"
            }`}
          >
            {i + 1} {step}
          </span>
        ))}
      </div>
      <EmptyState
        title="Choose a history report"
        body="Accepts .xlsx, .csv, and .html from MetaTrader 5. Parsing and preview land in the next slice."
      />
    </>
  );
}
