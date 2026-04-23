import { requireUser } from "@/lib/dal";
import { Nav } from "@/components/Nav";
import { DisplayNameForm } from "./DisplayNameForm";
import { UsernameForm } from "./UsernameForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-white/60">
            Update how you show up on the graph.
          </p>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Display name
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Shown under your dot. 1–24 characters.
          </p>
          <DisplayNameForm current={me.displayName} />
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Username
          </h2>
          <p className="mt-1 text-xs text-white/50">
            How friends add you. 3–20 chars, a–z, 0–9, _.
          </p>
          <UsernameForm current={me.username} />
        </section>
      </div>
    </main>
  );
}
