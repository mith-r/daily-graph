"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { updateDisplayName, updateUsername } from "@/lib/users";
import {
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
    return {
      error:
        parsed.error.issues[0]?.message ?? "Invalid display name.",
    };
  }
  const result = await updateDisplayName(me.id, parsed.data.displayName);
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/friends");
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
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid username.",
    };
  }
  const result = await updateUsername(me.id, parsed.data.username);
  if ("error" in result) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/friends");
  return { success: true };
}
