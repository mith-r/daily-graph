"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { FriendSummary } from "@/lib/types";
import { ReportButton } from "@/components/ReportDialog";
import { FriendActions } from "./FriendActions";
import { QuickAddButton } from "./QuickAddButton";
import { FriendGroupsManager } from "./FriendGroupsManager";

// Only non-sensitive fields cross to the client — never the user's email.
type Person = Pick<FriendSummary, "id" | "username" | "displayName">;

type Tab = "people" | "groups";

type Props = {
  meId: string;
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
  discover: Person[];
};

function PersonRow({
  user,
  action,
}: {
  user: Person;
  action: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
      <div>
        <div className="text-sm">{user.displayName}</div>
        <div className="text-xs text-white/50">@{user.username}</div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        <ReportButton reportedUserId={user.id} reportedName={user.displayName} />
      </div>
    </li>
  );
}

export function FriendsBrowser({
  meId,
  friends,
  incoming,
  outgoing,
  discover,
}: Props) {
  const [tab, setTab] = useState<Tab>("people");

  return (
    <div className="space-y-8">
      <div className="flex justify-center sm:justify-start">
        <TabBar tab={tab} onChange={setTab} />
      </div>

      {tab === "groups" ? (
        <FriendGroupsManager meId={meId} friends={friends} />
      ) : (
        <PeopleTab
          friends={friends}
          incoming={incoming}
          outgoing={outgoing}
          discover={discover}
        />
      )}
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.02] p-0.5 text-xs">
      <TabButton active={tab === "people"} onClick={() => onChange("people")}>
        People
      </TabButton>
      <TabButton active={tab === "groups"} onClick={() => onChange("groups")}>
        Groups
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 transition ${
        active
          ? "bg-white font-medium text-neutral-900"
          : "text-white/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PeopleTab({
  friends,
  incoming,
  outgoing,
  discover,
}: {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
  discover: Person[];
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const searching = q !== "";

  const filtered = useMemo(() => {
    const matches = (u: Person) =>
      q === "" ||
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q);
    return {
      friends: friends.filter(matches),
      incoming: incoming.filter(matches),
      outgoing: outgoing.filter(matches),
      discover: discover.filter(matches),
    };
  }, [q, friends, incoming, outgoing, discover]);

  const noResults =
    searching &&
    filtered.friends.length === 0 &&
    filtered.incoming.length === 0 &&
    filtered.outgoing.length === 0 &&
    filtered.discover.length === 0;

  return (
    <div className="space-y-10">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        placeholder="Search by name or @username"
        className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
      />

      {noResults && (
        <p className="text-sm text-white/50">
          No people match &ldquo;{query.trim()}&rdquo;.
        </p>
      )}

      {(!searching || filtered.discover.length > 0) && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Discover
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Everyone else on Daily Graph. Tap to send a request.
          </p>
          {filtered.discover.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">
              No one else to add right now.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {filtered.discover.map((u) => (
                <PersonRow
                  key={u.id}
                  user={u}
                  action={<QuickAddButton id={u.id} />}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {filtered.incoming.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Incoming requests
          </h2>
          <ul className="mt-3 space-y-2">
            {filtered.incoming.map((u) => (
              <PersonRow
                key={u.id}
                user={u}
                action={<FriendActions id={u.id} kind="incoming" />}
              />
            ))}
          </ul>
        </section>
      )}

      {filtered.outgoing.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Sent requests
          </h2>
          <ul className="mt-3 space-y-2">
            {filtered.outgoing.map((u) => (
              <PersonRow
                key={u.id}
                user={u}
                action={<FriendActions id={u.id} kind="outgoing" />}
              />
            ))}
          </ul>
        </section>
      )}

      {(!searching || filtered.friends.length > 0) && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Your friends
          </h2>
          {filtered.friends.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">No friends yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {filtered.friends.map((u) => (
                <PersonRow
                  key={u.id}
                  user={u}
                  action={<FriendActions id={u.id} kind="friend" />}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
