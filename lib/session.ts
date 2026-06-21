import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload } from "./types";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short (need 32+ chars). Run `openssl rand -base64 32` and set it in .env.local."
    );
  }
  return new TextEncoder().encode(secret);
}

async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, expiresAt: payload.expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const userId = typeof payload.userId === "string" ? payload.userId : null;
    const expiresAt =
      typeof payload.expiresAt === "number" ? payload.expiresAt : null;
    if (!userId || !expiresAt) return null;
    // `iat` (seconds) is set by .setIssuedAt() at signing; surfaced so the DAL
    // can reject sessions minted before the user's last password change.
    const issuedAt = typeof payload.iat === "number" ? payload.iat : undefined;
    return { userId, expiresAt, issuedAt };
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = await encryptSession({ userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

export async function deleteSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
