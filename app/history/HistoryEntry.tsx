import { GraphCanvas } from "@/components/GraphCanvas";
import { Dot } from "@/components/Dot";
import type { Placement, Prompt } from "@/lib/types";

type Entry = {
  date: string;
  pretty: string;
  prompt: Prompt;
  mine: Placement;
  others: Placement[];
  total: number;
};

export function HistoryEntry({
  entry,
  meId,
}: {
  entry: Entry;
  meId: string;
}) {
  const { pretty, prompt, mine, others, total } = entry;
  return (
    <article>
      <header className="text-center mb-8">
        <div className="text-xs uppercase tracking-widest text-white/50">
          {pretty}
        </div>
        <p className="mt-1 text-sm text-white/70">
          <span className="text-white/50">{prompt.xLeft}</span>
          {" ↔ "}
          <span className="text-white/50">{prompt.xRight}</span>
          {" · "}
          <span className="text-white/50">{prompt.yBottom}</span>
          {" ↕ "}
          <span className="text-white/50">{prompt.yTop}</span>
        </p>
      </header>

      <GraphCanvas prompt={prompt} disabled>
        {others.map((p) => (
          <Dot
            key={p.userId}
            x={p.x}
            y={p.y}
            label={p.displayName}
            userId={p.userId}
          />
        ))}
        <Dot
          x={mine.x}
          y={mine.y}
          label={mine.displayName}
          userId={meId}
          isMe
        />
      </GraphCanvas>

      <p className="mt-10 text-center text-xs text-white/40">
        {total === 1 ? "Only you placed." : `${total} people placed.`}
      </p>
    </article>
  );
}
