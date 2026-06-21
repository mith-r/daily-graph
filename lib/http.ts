import "server-only";
import { NextResponse } from "next/server";
import { getVerifiedUser } from "./dal";
import type { PublicUser } from "./types";

// Shared helpers for the app/api route handlers. Each returns either the value
// the handler wants or a ready-to-return NextResponse, so a route can guard with
// a single `instanceof NextResponse` check instead of repeating the boilerplate.

// Resolve the signed-in, email-verified user, or a 401 response.
//   const me = await requireVerified();
//   if (me instanceof NextResponse) return me;
export async function requireVerified(): Promise<PublicUser | NextResponse> {
  const me = await getVerifiedUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return me;
}

// Parse a JSON request body, or a 400 "bad json" response.
export async function readJson(req: Request): Promise<unknown | NextResponse> {
  try {
    return await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
}

// Coerce an unknown into a finite number, or null. Shared numeric guard so a
// crafted request can't smuggle NaN/Infinity/strings past a route's validation.
export function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
