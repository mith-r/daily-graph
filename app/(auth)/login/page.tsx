import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-white/60">
        Welcome back.
      </p>
      <LoginForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="underline text-white/60 hover:text-white">
          Forgot password?
        </Link>
      </p>
      <div className="mt-6 border-t border-white/10 pt-6">
        <p className="text-center text-sm text-white/60">New here?</p>
        <Link
          href="/signup"
          className="mt-3 block w-full rounded-md bg-white/5 border border-white/10 py-2 text-center font-medium text-white hover:bg-white/10"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
