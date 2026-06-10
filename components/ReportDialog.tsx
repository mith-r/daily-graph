"use client";

import { useActionState, useEffect, useState } from "react";
import {
  reportUserAction,
  type ReportFormState,
} from "@/app/actions/moderation";
import { REPORT_REASONS } from "@/lib/reportReasons";
import type { ReportReason } from "@/lib/types";

const initial: ReportFormState = undefined;

const fieldClass =
  "w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40 text-sm";

type ReportTarget = {
  reportedUserId: string;
  reportedName?: string;
  // What's being reported (e.g. a suggestion's text), attached for moderators.
  context?: string;
  defaultReason?: ReportReason;
};

// Ghost "Report" button that opens a lightweight modal. Drop it anywhere a user
// is shown (friends list, vote suggestions). Self-contained — only needs the
// target's id + (optionally) a display name and context.
export function ReportButton(props: ReportTarget) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-white/20 text-white/60 text-xs px-3 py-1.5 hover:text-white hover:border-white/40 transition"
      >
        Report
      </button>
      {open && <ReportDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportDialog({
  reportedUserId,
  reportedName,
  context,
  defaultReason,
  onClose,
}: ReportTarget & { onClose: () => void }) {
  const [state, action, pending] = useActionState(reportUserAction, initial);

  // Escape closes the dialog (matches the UserMenu pattern).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-dismiss shortly after a successful submit.
  useEffect(() => {
    if (!state?.success) return;
    const t = setTimeout(onClose, 1200);
    return () => clearTimeout(t);
  }, [state, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-navy p-5 shadow-xl">
        <h2 className="text-base font-semibold text-white">
          Report {reportedName ?? "user"}
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Reports are private and reviewed by moderators.
        </p>

        {state?.success ? (
          <p className="mt-4 text-sm text-green-400">
            Thanks — this has been sent to the moderators.
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-3">
            <input type="hidden" name="reportedUserId" value={reportedUserId} />
            {context && <input type="hidden" name="context" value={context} />}
            <div>
              <label className="block text-xs text-white/50 mb-1">Reason</label>
              <select
                name="reason"
                defaultValue={defaultReason ?? REPORT_REASONS[0].value}
                className={fieldClass}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-navy">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Details <span className="text-white/30">(optional)</span>
              </label>
              <textarea
                name="details"
                maxLength={500}
                rows={3}
                placeholder="Add anything that helps moderators."
                className={fieldClass}
              />
            </div>
            {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-white/20 text-white/70 text-sm px-3 py-1.5 hover:text-white hover:border-white/40 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-white text-neutral-900 font-medium text-sm px-4 py-1.5 disabled:opacity-40"
              >
                {pending ? "Sending…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
