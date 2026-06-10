"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  declineFriendRequest,
  getUserById,
  ignoreSuggestion,
  removeFriend,
  sendFriendRequestToUser,
} from "@/lib/users";

// Both /friends (friends list + request badge) and /friends/add (requests +
// suggestions) render this data, so every mutation revalidates both.
function revalidateFriendPages(): void {
  revalidatePath("/friends");
  revalidatePath("/friends/add");
}

export async function acceptFriendAction(requesterId: string): Promise<void> {
  const me = await requireUser();
  await acceptFriendRequest(me.id, requesterId);
  revalidateFriendPages();
  revalidatePath("/");
}

export async function declineFriendAction(requesterId: string): Promise<void> {
  const me = await requireUser();
  await declineFriendRequest(me.id, requesterId);
  revalidateFriendPages();
}

export async function cancelFriendAction(targetId: string): Promise<void> {
  const me = await requireUser();
  await cancelOutgoingRequest(me.id, targetId);
  revalidateFriendPages();
}

export async function removeFriendAction(friendId: string): Promise<void> {
  const me = await requireUser();
  await removeFriend(me.id, friendId);
  revalidateFriendPages();
  revalidatePath("/");
}

export async function quickAddFriendAction(targetId: string): Promise<void> {
  const me = await requireUser();
  const target = await getUserById(targetId);
  if (!target) return;
  await sendFriendRequestToUser(me.id, target);
  revalidateFriendPages();
}

export async function ignoreSuggestionAction(targetId: string): Promise<void> {
  const me = await requireUser();
  await ignoreSuggestion(me.id, targetId);
  revalidatePath("/friends/add");
}
