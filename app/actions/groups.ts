"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { setFriendGroups } from "@/lib/friendGroupsStore";
import type { FriendGroup } from "@/lib/friendGroups";

// Persist the viewer's friend-filter groups. The payload is client-supplied, so
// setFriendGroups re-validates it before writing.
export async function saveFriendGroupsAction(
  groups: FriendGroup[]
): Promise<void> {
  const me = await requireUser();
  await setFriendGroups(me.id, groups);
  // The home graph reads groups server-side to drive its filter.
  revalidatePath("/");
  revalidatePath("/friends");
}
