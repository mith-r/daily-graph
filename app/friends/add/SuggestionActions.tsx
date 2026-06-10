import {
  ignoreSuggestionAction,
  quickAddFriendAction,
} from "@/app/actions/friends";

// Add + Ignore pair for a suggestion row. Ignore hides the person from future
// suggestions (server-persisted) but they stay findable via search.
export function SuggestionActions({ id }: { id: string }) {
  const add = quickAddFriendAction.bind(null, id);
  const ignore = ignoreSuggestionAction.bind(null, id);
  return (
    <div className="flex gap-2">
      <form action={add}>
        <button className="rounded-md bg-white text-neutral-900 text-xs px-3 py-1.5 font-medium">
          Add
        </button>
      </form>
      <form action={ignore}>
        <button className="rounded-md border border-white/20 text-white/80 text-xs px-3 py-1.5">
          Ignore
        </button>
      </form>
    </div>
  );
}
