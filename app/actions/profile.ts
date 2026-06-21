"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import {
  removePhoto,
  updateAvatar,
  updateAvatarScale,
  updateDisplayName,
  updatePhoto,
  updateUsername,
} from "@/lib/users";
import { clampAvatarScale } from "@/lib/avatar";
import {
  AvatarConfigSchema,
  AvatarScaleSchema,
  firstIssueMessage,
  PhotoDataUrlSchema,
  UpdateDisplayNameSchema,
  UpdateUsernameSchema,
} from "@/lib/validation";

export type ProfileFormState =
  | { error?: string; success?: boolean }
  | undefined;

export async function updateDisplayNameAction(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const me = await requireUser();
  const parsed = UpdateDisplayNameSchema.safeParse({
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error, "Invalid display name.") };
  }
  const result = await updateDisplayName(me.id, parsed.data.displayName);
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/friends");
  revalidatePath("/friends/add");
  return { success: true };
}

export async function updateUsernameAction(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const me = await requireUser();
  const parsed = UpdateUsernameSchema.safeParse({
    username: formData.get("username"),
  });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error, "Invalid username.") };
  }
  const result = await updateUsername(me.id, parsed.data.username);
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/friends");
  revalidatePath("/friends/add");
  return { success: true };
}

export async function updateAvatarAction(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const me = await requireUser();
  const raw = formData.get("avatar");
  if (typeof raw !== "string") return { error: "Missing avatar data." };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "Invalid avatar data." };
  }

  const parsed = AvatarConfigSchema.safeParse(json);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error, "Invalid avatar.") };
  }

  const result = await updateAvatar(me.id, parsed.data);
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/profile");
  return { success: true };
}

// Upload a profile photo. The client pre-crops/compresses to a small square
// JPEG and sends it as a base64 data URL; we validate the type and size here as
// a safety net, then persist it (which also bumps the photo version).
export async function updatePhotoAction(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const me = await requireUser();
  const raw = formData.get("photo");
  const parsed = PhotoDataUrlSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error, "Invalid image.") };
  }
  const result = await updatePhoto(me.id, parsed.data);
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/profile");
  return { success: true };
}

// Remove the uploaded photo so the graph falls back to the designed bitmoji.
export async function removePhotoAction(): Promise<ProfileFormState> {
  const me = await requireUser();
  const result = await removePhoto(me.id);
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/profile");
  return { success: true };
}

// Save the viewer's graph-density preference. Called directly (not via a form)
// from the size slider when a drag settles. Clamps to the valid range so an
// out-of-bounds value is corrected rather than rejected.
export async function setAvatarScaleAction(
  scale: number
): Promise<ProfileFormState> {
  const me = await requireUser();
  const parsed = AvatarScaleSchema.safeParse({ scale });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error, "Invalid size.") };
  }
  const result = await updateAvatarScale(
    me.id,
    clampAvatarScale(parsed.data.scale)
  );
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/profile");
  return { success: true };
}
