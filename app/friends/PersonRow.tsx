import type { ReactNode } from "react";
import type { FriendSummary } from "@/lib/types";
import { ReportButton } from "@/components/ReportDialog";

// Only non-sensitive fields cross to the client — never the user's email.
export type Person = Pick<FriendSummary, "id" | "username" | "displayName">;

// Strip email (and any other secrets) before handing lists to client components.
export const toPerson = (u: FriendSummary): Person => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
});

// No "use client" — pure JSX, renders in both server and client trees.
export function PersonRow({
  user,
  subtitle,
  action,
}: {
  user: Person;
  subtitle?: ReactNode;
  action: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
      <div>
        <div className="text-sm">{user.displayName}</div>
        <div className="text-xs text-white/50">@{user.username}</div>
        {subtitle && <div className="text-xs text-white/40">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
        {action}
        <ReportButton reportedUserId={user.id} reportedName={user.displayName} />
      </div>
    </li>
  );
}
