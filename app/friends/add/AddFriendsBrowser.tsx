"use client";

import { useMemo, useState } from "react";
import { PersonRow, type Person } from "../PersonRow";
import { FriendActions } from "../FriendActions";
import { QuickAddButton } from "../QuickAddButton";
import { SuggestionActions } from "./SuggestionActions";

export type Suggestion = Person & { mutualCount: number };

type Props = {
  // Top-N ranked, ignored users excluded.
  suggestions: Suggestion[];
  // Every addable person (incl. ignored and beyond the top N) — search works
  // over this so anyone can still be found.
  searchPool: Suggestion[];
  incoming: Person[];
  outgoing: Person[];
};

function mutualLabel(count: number): string | null {
  if (count === 0) return null;
  return count === 1 ? "1 mutual friend" : `${count} mutual friends`;
}

export function AddFriendsBrowser({
  suggestions,
  searchPool,
  incoming,
  outgoing,
}: Props) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const searching = q !== "";

  const filtered = useMemo(() => {
    const matches = (u: Person) =>
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q);
    return {
      // When not searching, the suggestions section shows the ranked top-N;
      // a search widens to the full pool instead of narrowing the top-N.
      people: searching ? searchPool.filter(matches) : suggestions,
      incoming: searching ? incoming.filter(matches) : incoming,
      outgoing: searching ? outgoing.filter(matches) : outgoing,
    };
  }, [q, searching, suggestions, searchPool, incoming, outgoing]);

  const noResults =
    searching &&
    filtered.people.length === 0 &&
    filtered.incoming.length === 0 &&
    filtered.outgoing.length === 0;

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

      {(!searching || filtered.people.length > 0) && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            {searching ? "People" : "Suggestions"}
          </h2>
          <p className="mt-1 text-xs text-white/50">
            {searching
              ? "Tap to send a request."
              : "People you might know, ranked by mutual friends."}
          </p>
          {filtered.people.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">
              No suggestions right now — search to find people.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {filtered.people.map((u) => (
                <PersonRow
                  key={u.id}
                  user={u}
                  subtitle={mutualLabel(u.mutualCount)}
                  action={
                    searching ? (
                      <QuickAddButton id={u.id} />
                    ) : (
                      <SuggestionActions id={u.id} />
                    )
                  }
                />
              ))}
            </ul>
          )}
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
    </div>
  );
}
