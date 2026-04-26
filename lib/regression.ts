export type Point = { x: number; y: number; weight?: number };
export type LineSegment = { x1: number; y1: number; x2: number; y2: number };

const MIN_EFFECTIVE_POINTS = 3;
const MIN_VARIANCE = 0.005;

export function principalAxisLine(points: Point[]): LineSegment | null {
  let W = 0;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    const w = p.weight ?? 1;
    if (w <= 0) continue;
    W += w;
    sx += w * p.x;
    sy += w * p.y;
  }
  if (W < MIN_EFFECTIVE_POINTS) return null;

  const mx = sx / W;
  const my = sy / W;

  let Sxx = 0;
  let Syy = 0;
  let Sxy = 0;
  for (const p of points) {
    const w = p.weight ?? 1;
    if (w <= 0) continue;
    const dx = p.x - mx;
    const dy = p.y - my;
    Sxx += w * dx * dx;
    Syy += w * dy * dy;
    Sxy += w * dx * dy;
  }

  if ((Sxx + Syy) / W < MIN_VARIANCE) return null;

  // Largest eigenvalue of [[Sxx, Sxy],[Sxy, Syy]] and its eigenvector.
  const trace = Sxx + Syy;
  const disc = Math.sqrt((Sxx - Syy) * (Sxx - Syy) + 4 * Sxy * Sxy);
  const lambda = (trace + disc) / 2;

  let vx: number;
  let vy: number;
  if (Math.abs(Sxy) > 1e-9) {
    vx = Sxy;
    vy = lambda - Sxx;
  } else {
    // Already axis-aligned: pick whichever axis has more variance.
    if (Sxx >= Syy) {
      vx = 1;
      vy = 0;
    } else {
      vx = 0;
      vy = 1;
    }
  }
  const len = Math.hypot(vx, vy);
  if (len === 0) return null;
  vx /= len;
  vy /= len;

  return clipToUnitSquare(mx, my, vx, vy);
}

function clipToUnitSquare(
  cx: number,
  cy: number,
  vx: number,
  vy: number
): LineSegment | null {
  // Liang–Barsky on parametric line (cx + t*vx, cy + t*vy) against [-1, 1]^2.
  let tMin = -Infinity;
  let tMax = Infinity;

  const update = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return false;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return false;
      if (t < tMax) tMax = t;
    }
    return true;
  };

  if (!update(-vx, cx - -1)) return null;
  if (!update(vx, 1 - cx)) return null;
  if (!update(-vy, cy - -1)) return null;
  if (!update(vy, 1 - cy)) return null;

  if (tMin === -Infinity || tMax === Infinity || tMin >= tMax) return null;

  return {
    x1: cx + tMin * vx,
    y1: cy + tMin * vy,
    x2: cx + tMax * vx,
    y2: cy + tMax * vy,
  };
}
