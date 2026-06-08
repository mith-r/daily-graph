"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  declineFriendRequest,
  getUserById,
  removeFriend,
  sendFriendRequestToUser,
} from "@/lib/users";

export async function acceptFriendAction(requesterId: string): Promise<void> {
  const me = await requireUser();
  await acceptFriendRequest(me.id, requesterId);
  revalidatePath("/friends");
  revalidatePath("/");
}

export async function declineFriendAction(requesterId: string): Promise<void> {
  const me = await requireUser();
  await declineFriendRequest(me.id, requesterId);
  revalidatePath("/friends");
}

export async function cancelFriendAction(targetId: string): Promise<void> {
  const me = await requireUser();
  await cancelOutgoingRequest(me.id, targetId);
  revalidatePath("/friends");
}

export async function removeFriendAction(friendId: string): Promise<void> {
  const me = await requireUser();
  await removeFriend(me.id, friendId);
  revalidatePath("/friends");
  revalidatePath("/");
}

export async function quickAddFriendAction(targetId: string): Promise<void> {
  const me = await requireUser();
  const target = await getUserById(targetId);
  if (!target) return;
  await sendFriendRequestToUser(me.id, target);
  revalidatePath("/friends");
}
