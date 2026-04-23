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
      <p className="mt-6 text-center text-sm text-white/60">
        New here?{" "}
        <Link href="/signup" className="underline text-white">
          Create an account
        </Link>
      </p>
    </div>
  );
}
