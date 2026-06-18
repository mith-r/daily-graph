import Link from "next/link";
import { WelcomeHero } from "./WelcomeHero";

// The first screen a logged-out visitor sees (the proxy redirects here). A
// marketing-style animated hero, then a branch to the two separate auth pages —
// Create account for new visitors, Log in for returning ones.
export default function WelcomePage() {
  return (
    <div>
      <WelcomeHero />

      <div className="mt-8 space-y-3 text-left">
        <Link
          href="/signup"
          className="flex items-center justify-between gap-3 rounded-md bg-white px-4 py-3 font-medium text-neutral-900 hover:bg-white/90"
        >
          <span>
            Create an account
            <span className="block text-xs font-normal text-neutral-500">
              New to Daily Graph
            </span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center justify-between gap-3 rounded-md border border-white/20 bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/15"
        >
          <span>
            Log in
            <span className="block text-xs font-normal text-white/50">
              Already have an account
            </span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
