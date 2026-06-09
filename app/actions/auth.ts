"use server";

import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { recordSignup } from "@/lib/analytics";
import { createSession, deleteSession } from "@/lib/session";
import { createUser, getUserByEmail, verifyPassword } from "@/lib/users";
import { LoginSchema, SignupSchema } from "@/lib/validation";

export type AuthFormState =
  | {
      errors?: {
        email?: string[];
        username?: string[];
        displayName?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export async function signup(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createUser(parsed.data);
  if ("error" in result) {
    return { message: result.error };
  }

  if (!isAdminEmail(parsed.data.email)) {
    await recordSignup().catch((err) => {
      console.error("analytics signup counter failed:", err);
    });
  }
  await createSession(result.id);
  redirect("/");
}

export async function login(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const user = await getUserByEmail(parsed.data.email);
  if (!user) return { message: "Invalid email or password." };

  const ok = await verifyPassword(user, parsed.data.password);
  if (!ok) return { message: "Invalid email or password." };

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
