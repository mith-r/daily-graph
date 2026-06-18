import { redirect } from "next/navigation";

// The welcome experience now lives in the animated, self-contained
// public/landing.html (the proxy sends logged-out visitors straight there).
// Keep /welcome as a stable alias that forwards to it.
export default function WelcomePage() {
  redirect("/landing.html");
}
