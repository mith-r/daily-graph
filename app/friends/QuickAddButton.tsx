import { quickAddFriendAction } from "@/app/actions/friends";

export function QuickAddButton({ id }: { id: string }) {
  const add = quickAddFriendAction.bind(null, id);
  return (
    <form action={add}>
      <button className="rounded-md bg-white text-neutral-900 text-xs px-3 py-1.5 font-medium">
        Add
      </button>
    </form>
  );
}
