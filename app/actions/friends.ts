"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/lib/users";
import { FriendEmailSchema } from "@/lib/validation";

export type FriendRequestState =
  | { error?: string; success?: boolean }
  | undefined;

export async function addFriendAction(
  _state: FriendRequestState,
  formData: FormData
): Promise<FriendRequestState> {
  const me = await requireUser();
  const parsed = FriendEmailSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email." };
  }
  const result = await sendFriendRequest(me.id, parsed.data.email);
  if ("error" in result) return { error: result.error };
  revalidatePath("/friends");
  return { success: true };
}

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
