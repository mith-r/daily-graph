import {
  acceptFriendAction,
  cancelFriendAction,
  declineFriendAction,
  removeFriendAction,
} from "@/app/actions/friends";

type Props = {
  id: string;
  kind: "incoming" | "outgoing" | "friend";
};

export function FriendActions({ id, kind }: Props) {
  if (kind === "incoming") {
    const accept = acceptFriendAction.bind(null, id);
    const decline = declineFriendAction.bind(null, id);
    return (
      <div className="flex gap-2">
        <form action={accept}>
          <button className="rounded-md bg-white text-neutral-900 text-xs px-3 py-1.5 font-medium">
            Accept
          </button>
        </form>
        <form action={decline}>
          <button className="rounded-md border border-white/20 text-white/80 text-xs px-3 py-1.5">
            Decline
          </button>
        </form>
      </div>
    );
  }

  if (kind === "outgoing") {
    const cancel = cancelFriendAction.bind(null, id);
    return (
      <form action={cancel}>
        <button className="rounded-md border border-white/20 text-white/80 text-xs px-3 py-1.5">
          Cancel
        </button>
      </form>
    );
  }

  const remove = removeFriendAction.bind(null, id);
  return (
    <form action={remove}>
      <button className="rounded-md border border-white/20 text-white/80 text-xs px-3 py-1.5">
        Remove
      </button>
    </form>
  );
}
