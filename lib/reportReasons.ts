import type { ReportReason } from "./types";

// Single source of truth for the report categories, shared by the report dialog
// (select options), the admin queue (display), and the ban reason. No
// "server-only" — it imports only a type, so the client bundle can use it too.
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "inappropriate_suggestion", label: "Inappropriate suggestion" },
  { value: "impersonation", label: "Impersonation / posing as someone" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Something else" },
];

export function reportReasonLabel(reason: ReportReason): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
}
