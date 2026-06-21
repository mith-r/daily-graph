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

// Require a genuine finite number, else null. Deliberately does NOT Number()-
// coerce: null/""/[]/false would become 0 and true would become 1 — all
// "valid" coords/offsets — silently pinning junk input. Anything that isn't
// already a finite number is rejected so the caller can 400 it.
export function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
