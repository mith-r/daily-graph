import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-white/60">
        We&apos;ll email you a 6-digit code.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-white/60">
        Remembered it?{" "}
        <Link href="/login" className="underline text-white">
          Log in
        </Link>
      </p>
    </div>
  );
}
