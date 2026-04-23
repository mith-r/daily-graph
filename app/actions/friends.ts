"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  declineFriendRequest,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  removeFriend,
  sendFriendRequestToUser,
} from "@/lib/users";
import {
  FriendIdentifierSchema,
  parseFriendIdentifier,
} from "@/lib/validation";

export type FriendRequestState =
  | { error?: string; success?: boolean }
  | undefined;

export async function addFriendAction(
  _state: FriendRequestState,
  formData: FormData
): Promise<FriendRequestState> {
  const me = await requireUser();
  const parsed = FriendIdentifierSchema.safeParse({
    identifier: formData.get("identifier"),
  });
  if (!parsed.success) return { error: "Enter an email or @username." };

  const resolved = parseFriendIdentifier(parsed.data.identifier);
  if (!resolved) return { error: "Enter a valid email or @username." };

  const target =
    resolved.kind === "email"
      ? await getUserByEmail(resolved.value)
      : await getUserByUsername(resolved.value);
  if (!target) {
    return {
      error:
        resolved.kind === "email"
          ? "No user with that email."
          : "No user with that username.",
    };
  }

  const result = await sendFriendRequestToUser(me.id, target);
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

export async function quickAddFriendAction(targetId: string): Promise<void> {
  const me = await requireUser();
  const target = await getUserById(targetId);
  if (!target) return;
  await sendFriendRequestToUser(me.id, target);
  revalidatePath("/friends");
}
