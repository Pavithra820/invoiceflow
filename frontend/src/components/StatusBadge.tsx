import type { InvoiceStatus } from "../api/types";

const LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  processing: "Processing",
  needs_review: "Needs review",
  approved: "Approved",
  failed: "Failed",
};

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
