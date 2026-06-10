import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { VerifyEmailForm } from "./VerifyEmailForm";

// The parking spot for unverified accounts: requireUser() bounces them here
// from every protected page. Uses getCurrentUser directly (NOT requireUser —
// that would redirect right back here in a loop).
export default async function VerifyEmailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="mt-1 text-sm text-white/60">
        We sent a 6-digit code to{" "}
        <span className="text-white">{user.email}</span>. Enter it below to
        verify your account.
      </p>
      <VerifyEmailForm initialEmail={user.email} />
      <form action={logout} className="mt-6 text-center">
        <button
          type="submit"
          className="text-sm text-white/60 underline hover:text-white"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
