"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { addSuggestion, openRoundDate } from "@/lib/voting";

export type SuggestPromptState =
  | { error?: string; success?: boolean }
  | undefined;

export async function suggestPromptAction(
  _state: SuggestPromptState,
  formData: FormData
): Promise<SuggestPromptState> {
  const me = await requireUser();
  const result = await addSuggestion(
    openRoundDate(),
    {
      xLeft: String(formData.get("xLeft") ?? ""),
      xRight: String(formData.get("xRight") ?? ""),
      yBottom: String(formData.get("yBottom") ?? ""),
      yTop: String(formData.get("yTop") ?? ""),
    },
    { id: me.id, displayName: me.displayName }
  );
  if (!result.ok) return { error: result.error };
  revalidatePath("/vote");
  return { success: true };
}
