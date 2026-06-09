"use client";

import { useActionState, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import {
  BG_COLORS,
  BROWS,
  EYES,
  FACIAL_HAIR,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  MOUTHS,
  SKIN_TONES,
  randomAvatar,
  type Option,
} from "@/lib/avatar";
import {
  updateAvatarAction,
  type ProfileFormState,
} from "@/app/actions/profile";
import type { AvatarConfig } from "@/lib/types";

const initialState: ProfileFormState = undefined;

type ShapeKey =
  | "hair"
  | "brows"
  | "eyes"
  | "mouth"
  | "facialHair"
  | "glasses"
  | "hat";
type ColorKey = "skin" | "bg" | "hairColor";

type Row =
  | { type: "shape"; key: ShapeKey; label: string; options: Option[] }
  | { type: "color"; key: ColorKey; label: string; palette: readonly string[] };

// One control row per feature, ordered so related choices sit together (hair
// shape next to hair color), background last.
const ROWS: Row[] = [
  { type: "color", key: "skin", label: "Skin", palette: SKIN_TONES },
  { type: "shape", key: "hair", label: "Hair", options: HAIR_STYLES },
  { type: "color", key: "hairColor", label: "Hair color", palette: HAIR_COLORS },
  { type: "shape", key: "brows", label: "Brows", options: BROWS },
  { type: "shape", key: "eyes", label: "Eyes", options: EYES },
  { type: "shape", key: "mouth", label: "Mouth", options: MOUTHS },
  {
    type: "shape",
    key: "facialHair",
    label: "Facial hair",
    options: FACIAL_HAIR,
  },
  { type: "shape", key: "glasses", label: "Glasses", options: GLASSES },
  { type: "shape", key: "hat", label: "Hat", options: HATS },
  { type: "color", key: "bg", label: "Background", palette: BG_COLORS },
];

export function AvatarEditor({
  initial,
  seed,
}: {
  initial: AvatarConfig;
  seed: string;
}) {
  const [config, setConfig] = useState<AvatarConfig>(initial);
  const [state, action, pending] = useActionState(
    updateAvatarAction,
    initialState
  );
  // Deterministic per-click variation: bump a counter and fold it into the seed
  // so each press yields a fresh — but reproducible — face (no Math.random, so
  // no hydration concerns).
  const randomCount = useRef(0);

  const set = (key: keyof AvatarConfig, value: string) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const randomize = () => {
    randomCount.current += 1;
    setConfig(randomAvatar(`${seed}:${randomCount.current}`));
  };

  return (
    <form action={action} className="space-y-8">
      {/* Live preview + randomize. */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="rounded-full"
          style={{
            boxShadow:
              "0 0 0 3px rgba(255,255,255,0.85), 0 0 24px rgba(0,0,0,0.4)",
          }}
        >
          <Avatar config={config} size={140} title="Avatar preview" />
        </div>
        <button
          type="button"
          onClick={randomize}
          className="text-sm rounded-full border border-white/15 px-4 py-1.5 text-white/80 hover:text-white hover:border-white/40 transition"
        >
          🎲 Randomize
        </button>
      </div>

      {/* Per-feature controls. */}
      <div className="space-y-6">
        {ROWS.map((row) => (
          <div key={row.key}>
            <h2 className="text-xs uppercase tracking-widest text-white/50 mb-2">
              {row.label}
            </h2>
            {row.type === "shape" ? (
              <ChipRow
                options={row.options}
                value={config[row.key]}
                onSelect={(id) => set(row.key, id)}
              />
            ) : (
              <SwatchRow
                palette={row.palette}
                value={config[row.key]}
                onSelect={(hex) => set(row.key, hex)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Carries the full config to the server action as a JSON string. */}
      <input type="hidden" name="avatar" value={JSON.stringify(config)} />

      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state?.success && <p className="text-xs text-emerald-400">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-white text-neutral-900 font-medium py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function ChipRow({
  options,
  value,
  onSelect,
}: {
  options: Option[];
  value: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(o.id)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              active
                ? "bg-white text-neutral-900 font-medium"
                : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SwatchRow({
  palette,
  value,
  onSelect,
}: {
  palette: readonly string[];
  value: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {palette.map((hex) => {
        const active = hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            aria-label={hex}
            aria-pressed={active}
            onClick={() => onSelect(hex)}
            className={`h-8 w-8 rounded-full transition ${
              active
                ? "ring-2 ring-white scale-110"
                : "ring-1 ring-white/20 hover:ring-white/50"
            }`}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
