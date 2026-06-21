"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { requireAdmin } from "@/lib/admin";
import { getUserById } from "@/lib/users";
import {
  banUser,
  createReport,
  getReport,
  resolveReport,
  unbanUser,
} from "@/lib/moderation";
import { reportReasonLabel } from "@/lib/reportReasons";
import { firstIssueMessage, ReportSchema } from "@/lib/validation";

export type ReportFormState = { error?: string; success?: boolean } | undefined;

// User-facing: file a report against another account.
export async function reportUserAction(
  _state: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const me = await requireUser();

  const parsed = ReportSchema.safeParse({
    reportedUserId: formData.get("reportedUserId"),
    reason: formData.get("reason"),
    details: formData.get("details") || undefined,
    context: formData.get("context") || undefined,
  });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error, "Invalid report.") };
  }
  if (parsed.data.reportedUserId === me.id) {
    return { error: "You can't report yourself." };
  }
  const target = await getUserById(parsed.data.reportedUserId);
  if (!target) return { error: "That account no longer exists." };

  // createReport is idempotent per (reporter, target): a repeat returns success
  // without creating a second report, so we never reveal a prior report.
  await createReport({
    reporterId: me.id,
    reportedUserId: parsed.data.reportedUserId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    context: parsed.data.context,
  });
  return { success: true };
}

// --- Mod actions (admin-only) ---

export async function banUserAction(reportId: string): Promise<void> {
  const admin = await requireAdmin();
  // Source the ban target from the trusted, server-stored report — never from a
  // separate client-supplied id, which could be made to diverge from the report
  // being actioned (ban user A while marking B's report "actioned").
  const report = await getReport(reportId);
  if (!report) return;
  await banUser(report.reportedUserId, reportReasonLabel(report.reason), admin.id);
  await resolveReport(reportId, "actioned", admin.id);
  revalidatePath("/admin");
}

export async function dismissReportAction(reportId: string): Promise<void> {
  const admin = await requireAdmin();
  await resolveReport(reportId, "dismissed", admin.id);
  revalidatePath("/admin");
}

export async function unbanUserAction(userId: string): Promise<void> {
  await requireAdmin();
  await unbanUser(userId);
  revalidatePath("/admin");
}
