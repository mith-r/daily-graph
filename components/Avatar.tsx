import type { ReactNode } from "react";
import type { AvatarConfig } from "@/lib/types";

// Pure presentational SVG face. No hooks, no "use client" — safe to render from
// both the client editor and the client Dot. The avatar is cropped to a circle
// by the SVG viewport itself (overflow:hidden + border-radius:50%), so hats and
// big hair that spill past the head are trimmed to the round frame without
// needing a clipPath (which would require collision-prone element ids).
//
// Layout (viewBox 0 0 100 100): the head is an ellipse centered at (50, 53);
// eyes sit at y≈53, brows at y≈43, the mouth at y≈69. Each feature below is a
// small map id → SVG fragment; an unknown/missing id falls back to a default so
// a stale or malformed config still renders something sensible.

// Shared dark tone for eyes/linework. Deliberately not pure black so it reads
// soft on small dots.
const INK = "#2b2b38";
const LIP = "#bf5a52";

const LEFT_EYE_X = 38;
const RIGHT_EYE_X = 62;
const EYE_Y = 53;
const BROW_Y = 43;

// --- Hair: split into a back layer (behind the head) and a front layer (over
// the forehead), so long/afro styles can frame the face. ---

function hairBack(id: string, color: string): ReactNode {
  switch (id) {
    case "long":
      return (
        <path
          d="M22 48 Q20 84 30 92 L34 70 Q30 54 34 40 Q50 30 66 40 Q70 54 66 70 L70 92 Q80 84 78 48 Q78 20 50 20 Q22 20 22 48 Z"
          fill={color}
        />
      );
    case "afro":
      return <circle cx="50" cy="40" r="34" fill={color} />;
    case "curly":
      return (
        <g fill={color}>
          <circle cx="24" cy="44" r="11" />
          <circle cx="76" cy="44" r="11" />
          <circle cx="30" cy="62" r="9" />
          <circle cx="70" cy="62" r="9" />
        </g>
      );
    case "bun":
      return <circle cx="50" cy="20" r="9" fill={color} />;
    default:
      return null;
  }
}

function hairFront(id: string, color: string): ReactNode {
  switch (id) {
    case "none":
      return null;
    case "short":
      return (
        <path
          d="M24 50 Q22 24 50 24 Q78 24 76 50 Q72 36 50 35 Q28 36 24 50 Z"
          fill={color}
        />
      );
    case "buzz":
      return (
        <path
          d="M25 49 Q24 26 50 26 Q76 26 75 49 Q70 40 50 40 Q30 40 25 49 Z"
          fill={color}
          opacity={0.85}
        />
      );
    case "side":
      return (
        <path
          d="M24 50 Q23 25 50 25 Q79 25 76 49 Q70 37 44 37 Q34 37 30 52 Q27 44 24 50 Z"
          fill={color}
        />
      );
    case "curly":
      return (
        <g fill={color}>
          <circle cx="34" cy="32" r="10" />
          <circle cx="50" cy="28" r="11" />
          <circle cx="66" cy="32" r="10" />
          <circle cx="26" cy="42" r="8" />
          <circle cx="74" cy="42" r="8" />
        </g>
      );
    case "long":
      return (
        <path
          d="M24 52 Q22 24 50 24 Q78 24 76 52 Q70 36 50 35 Q30 36 24 52 Z"
          fill={color}
        />
      );
    case "bun":
      return (
        <path
          d="M26 48 Q26 26 50 26 Q74 26 74 48 Q68 38 50 38 Q32 38 26 48 Z"
          fill={color}
        />
      );
    case "afro":
      return (
        <path
          d="M24 52 Q22 30 50 30 Q78 30 76 52 Q70 42 50 42 Q30 42 24 52 Z"
          fill={color}
        />
      );
    case "mohawk":
      return (
        <path
          d="M44 24 Q50 12 56 24 L56 40 Q50 36 44 40 Z"
          fill={color}
        />
      );
    default:
      // Unknown id → fall back to the simple short cap.
      return hairFront("short", color);
  }
}

// --- Brows (use hair color so they read as a set with the hair). ---

function brows(id: string, color: string): ReactNode {
  const w = 9;
  const lx = LEFT_EYE_X;
  const rx = RIGHT_EYE_X;
  const stroke = {
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    fill: "none" as const,
  };
  switch (id) {
    case "raised":
      return (
        <g {...stroke}>
          <path d={`M${lx - w} ${BROW_Y} Q${lx} ${BROW_Y - 5} ${lx + w} ${BROW_Y}`} />
          <path d={`M${rx - w} ${BROW_Y} Q${rx} ${BROW_Y - 5} ${rx + w} ${BROW_Y}`} />
        </g>
      );
    case "angry":
      return (
        <g {...stroke}>
          <path d={`M${lx - w} ${BROW_Y - 2} L${lx + w} ${BROW_Y + 3}`} />
          <path d={`M${rx + w} ${BROW_Y - 2} L${rx - w} ${BROW_Y + 3}`} />
        </g>
      );
    case "flat":
      return (
        <g {...stroke}>
          <path d={`M${lx - w} ${BROW_Y} L${lx + w} ${BROW_Y}`} />
          <path d={`M${rx - w} ${BROW_Y} L${rx + w} ${BROW_Y}`} />
        </g>
      );
    case "neutral":
    default:
      return (
        <g {...stroke}>
          <path d={`M${lx - w} ${BROW_Y + 1} Q${lx} ${BROW_Y - 2} ${lx + w} ${BROW_Y + 1}`} />
          <path d={`M${rx - w} ${BROW_Y + 1} Q${rx} ${BROW_Y - 2} ${rx + w} ${BROW_Y + 1}`} />
        </g>
      );
  }
}

// --- Eyes ---

function openEye(cx: number, ry = 6): ReactNode {
  return (
    <>
      <ellipse cx={cx} cy={EYE_Y} rx={5} ry={ry} fill="#ffffff" />
      <circle cx={cx} cy={EYE_Y + 0.5} r={2.7} fill={INK} />
    </>
  );
}

function closedEye(cx: number): ReactNode {
  return (
    <path
      d={`M${cx - 5} ${EYE_Y} Q${cx} ${EYE_Y + 4} ${cx + 5} ${EYE_Y}`}
      stroke={INK}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
  );
}

function eyes(id: string): ReactNode {
  switch (id) {
    case "happy":
      return (
        <g
          stroke={INK}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        >
          <path d={`M${LEFT_EYE_X - 5} ${EYE_Y} Q${LEFT_EYE_X} ${EYE_Y - 5} ${LEFT_EYE_X + 5} ${EYE_Y}`} />
          <path d={`M${RIGHT_EYE_X - 5} ${EYE_Y} Q${RIGHT_EYE_X} ${EYE_Y - 5} ${RIGHT_EYE_X + 5} ${EYE_Y}`} />
        </g>
      );
    case "sleepy":
      return (
        <g>
          {closedEye(LEFT_EYE_X)}
          {closedEye(RIGHT_EYE_X)}
        </g>
      );
    case "wink":
      return (
        <g>
          {openEye(LEFT_EYE_X)}
          {closedEye(RIGHT_EYE_X)}
        </g>
      );
    case "wide":
      return (
        <g>
          {openEye(LEFT_EYE_X, 7.5)}
          {openEye(RIGHT_EYE_X, 7.5)}
        </g>
      );
    case "round":
    default:
      return (
        <g>
          {openEye(LEFT_EYE_X)}
          {openEye(RIGHT_EYE_X)}
        </g>
      );
  }
}

// --- Facial hair (uses hair color) ---

function facialHair(id: string, color: string): ReactNode {
  switch (id) {
    case "none":
      return null;
    case "stubble":
      return (
        <path
          d="M28 60 Q30 82 50 82 Q70 82 72 60 Q66 72 50 72 Q34 72 28 60 Z"
          fill={color}
          opacity={0.28}
        />
      );
    case "mustache":
      return (
        <path
          d="M40 63 Q45 61 50 64 Q55 61 60 63 Q56 68 50 66 Q44 68 40 63 Z"
          fill={color}
        />
      );
    case "beard":
      return (
        <path
          d="M27 56 Q28 84 50 84 Q72 84 73 56 Q70 70 62 74 Q56 78 50 78 Q44 78 38 74 Q30 70 27 56 Z"
          fill={color}
        />
      );
    case "goatee":
      return (
        <g fill={color}>
          <path d="M40 63 Q45 61 50 64 Q55 61 60 63 Q56 67 50 65 Q44 67 40 63 Z" />
          <path d="M44 73 Q50 80 56 73 Q53 77 50 77 Q47 77 44 73 Z" />
        </g>
      );
    default:
      return null;
  }
}

// --- Mouth ---

function mouth(id: string): ReactNode {
  const y = 69;
  switch (id) {
    case "grin":
      return (
        <g>
          <path
            d={`M40 ${y - 1} Q50 ${y + 9} 60 ${y - 1} Z`}
            fill={INK}
          />
          <path
            d={`M42 ${y} Q50 ${y + 3} 58 ${y}`}
            fill="#ffffff"
            stroke="none"
          />
        </g>
      );
    case "neutral":
      return (
        <path
          d={`M44 ${y + 1} L56 ${y + 1}`}
          stroke={LIP}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
      );
    case "frown":
      return (
        <path
          d={`M43 ${y + 4} Q50 ${y - 4} 57 ${y + 4}`}
          stroke={LIP}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
      );
    case "open":
      return <ellipse cx={50} cy={y + 1} rx={5} ry={6} fill={LIP} />;
    case "smile":
    default:
      return (
        <path
          d={`M42 ${y - 2} Q50 ${y + 7} 58 ${y - 2}`}
          stroke={LIP}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
      );
  }
}

// --- Glasses (drawn over hair, per the layering order) ---

function glasses(id: string): ReactNode {
  if (id === "none") return null;
  const frame = {
    stroke: INK,
    strokeWidth: 2,
    fill: "none" as const,
  };
  switch (id) {
    case "round":
      return (
        <g {...frame}>
          <circle cx={LEFT_EYE_X} cy={EYE_Y} r={8} />
          <circle cx={RIGHT_EYE_X} cy={EYE_Y} r={8} />
          <path d={`M${LEFT_EYE_X + 8} ${EYE_Y} L${RIGHT_EYE_X - 8} ${EYE_Y}`} />
          <path d={`M${LEFT_EYE_X - 8} ${EYE_Y - 1} L22 ${EYE_Y - 3}`} />
          <path d={`M${RIGHT_EYE_X + 8} ${EYE_Y - 1} L78 ${EYE_Y - 3}`} />
        </g>
      );
    case "square":
      return (
        <g {...frame}>
          <rect x={LEFT_EYE_X - 8} y={EYE_Y - 6} width={16} height={13} rx={3} />
          <rect x={RIGHT_EYE_X - 8} y={EYE_Y - 6} width={16} height={13} rx={3} />
          <path d={`M${LEFT_EYE_X + 8} ${EYE_Y} L${RIGHT_EYE_X - 8} ${EYE_Y}`} />
          <path d={`M${LEFT_EYE_X - 8} ${EYE_Y - 3} L22 ${EYE_Y - 4}`} />
          <path d={`M${RIGHT_EYE_X + 8} ${EYE_Y - 3} L78 ${EYE_Y - 4}`} />
        </g>
      );
    case "sunglasses":
      return (
        <g>
          <path
            d={`M${LEFT_EYE_X - 9} ${EYE_Y - 6} h17 v6 q0 7 -8.5 7 q-8.5 0 -8.5 -7 Z`}
            fill={INK}
          />
          <path
            d={`M${RIGHT_EYE_X - 9} ${EYE_Y - 6} h17 v6 q0 7 -8.5 7 q-8.5 0 -8.5 -7 Z`}
            fill={INK}
          />
          <path
            d={`M${LEFT_EYE_X + 8} ${EYE_Y - 4} L${RIGHT_EYE_X - 8} ${EYE_Y - 4}`}
            stroke={INK}
            strokeWidth={2.4}
            fill="none"
          />
        </g>
      );
    default:
      return null;
  }
}

// --- Hats (drawn last, on top of everything) ---

function hat(id: string): ReactNode {
  switch (id) {
    case "none":
      return null;
    case "beanie":
      return (
        <g>
          <path d="M24 34 Q24 14 50 14 Q76 14 76 34 Q62 26 50 26 Q38 26 24 34 Z" fill="#c0392b" />
          <rect x="22" y="32" width="56" height="7" rx="3.5" fill="#e74c3c" />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M26 36 Q26 16 50 16 Q74 16 74 36 Q62 30 50 30 Q38 30 26 36 Z" fill="#2e6db4" />
          <path d="M24 36 Q40 34 60 35 Q78 36 84 41 Q70 41 24 39 Z" fill="#244f86" />
        </g>
      );
    case "tophat":
      return (
        <g fill="#1f2430">
          <rect x="18" y="30" width="64" height="6" rx="3" />
          <rect x="30" y="6" width="40" height="26" rx="3" />
          <rect x="30" y="24" width="40" height="5" fill="#7a2235" />
        </g>
      );
    default:
      return null;
  }
}

export function Avatar({
  config,
  size,
  title,
}: {
  config: AvatarConfig;
  size: number;
  // Optional accessible name. Omitted → the SVG is decorative (aria-hidden),
  // which is right for the graph dots: each already has a visible name label
  // beside it, so announcing a generic "avatar" too would just be noise.
  title?: string;
}) {
  const { skin, bg, hairColor } = config;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{
        display: "block",
        overflow: "hidden",
        borderRadius: "50%",
      }}
    >
      {/* Background fills the whole square; the round crop comes from the
          svg's border-radius + overflow:hidden. */}
      <rect x="0" y="0" width="100" height="100" fill={bg} />

      {/* Face group, scaled up about the circle's center (50,50) so the head,
          hair, and features fill more of the round frame instead of floating in
          a wide ring of background. The svg's border-radius crops whatever
          spills past the circle. */}
      <g transform="translate(-15 -15) scale(1.3)">
        {hairBack(config.hair, hairColor)}

        {/* Neck + ears + head, all skin-colored. Neck/ears first so the head
            ellipse overlaps their inner edges. */}
        <rect x="42" y="70" width="16" height="22" fill={skin} />
        <ellipse cx="25" cy="55" rx="5" ry="7" fill={skin} />
        <ellipse cx="75" cy="55" rx="5" ry="7" fill={skin} />
        <ellipse cx="50" cy="53" rx="26" ry="30" fill={skin} />

        {/* Subtle nose. */}
        <path
          d="M47 60 Q50 64 53 60"
          fill="none"
          stroke="rgba(0,0,0,0.16)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />

        {brows(config.brows, hairColor)}
        {eyes(config.eyes)}
        {facialHair(config.facialHair, hairColor)}
        {mouth(config.mouth)}
        {hairFront(config.hair, hairColor)}
        {glasses(config.glasses)}
        {hat(config.hat)}
      </g>
    </svg>
  );
}
