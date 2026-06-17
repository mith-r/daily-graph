import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Team · Daily Graph",
  description: "The people building Daily Graph.",
};

type Member = {
  name: string;
  role: string;
  /** Path under /public, or null to fall back to an initials avatar. */
  photo: string | null;
  /** CSS object-position for the circular crop. Defaults to center. */
  focus?: string;
};

const TEAM: Member[] = [
  { name: "Thomas Dennis", role: "CEO", photo: "/team/thomas-dennis.jpg", focus: "center top" },
  { name: "Mithun Rameshkumar", role: "CTO", photo: "/team/mithun-rameshkumar.jpg" },
  { name: "Jasper Johnson", role: "CMO", photo: "/team/jasper-johnson.jpg" },
  { name: "Aren Carlson", role: "Founding Engineer", photo: "/team/aren-carlson.jpg" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberCard({ member }: { member: Member }) {
  return (
    <li className="flex flex-col items-center text-center rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="relative h-32 w-32 overflow-hidden rounded-full ring-1 ring-white/10">
        {member.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photo}
            alt={member.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: member.focus ?? "center" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-2xl font-semibold text-white/70">
            {initials(member.name)}
          </div>
        )}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">{member.name}</h2>
      <p className="mt-1 text-sm text-white/60">{member.role}</p>
    </li>
  );
}

export default async function TeamPage() {
  const me = await requireUser();
  return (
    <main className="flex-1 bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-semibold">Our Team</h1>
        <p className="mt-2 text-white/60">The people building Daily Graph.</p>

        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {TEAM.map((member) => (
            <MemberCard key={member.name} member={member} />
          ))}
        </ul>
      </div>
    </main>
  );
}
