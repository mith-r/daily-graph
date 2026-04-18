type Props = {
  date: string;
  placed: boolean;
};

export function PromptHeader({ date, placed }: Props) {
  const pretty = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <header className="text-center mb-10">
      <div className="text-xs uppercase tracking-widest text-white/50">
        {pretty}
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-white">
        {placed ? "Where everyone landed" : "Place yourself"}
      </h1>
      {!placed && (
        <p className="mt-1 text-sm text-white/60">
          Click anywhere on the graph. You&apos;ll see where others landed after.
        </p>
      )}
    </header>
  );
}
