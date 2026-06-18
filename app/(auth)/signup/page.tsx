import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-1 text-sm text-white/60">
        Sign up to place yourself and see friends on the daily graph.
      </p>
      <SignupForm />
      <div className="mt-6 border-t border-white/10 pt-6">
        <p className="text-center text-sm text-white/60">
          Already have an account?
        </p>
        <Link
          href="/login"
          className="mt-3 block w-full rounded-md bg-white/5 border border-white/10 py-2 text-center font-medium text-white hover:bg-white/10"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
