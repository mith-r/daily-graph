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
      <p className="mt-6 text-center text-sm text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="underline text-white">
          Log in
        </Link>
      </p>
    </div>
  );
}
