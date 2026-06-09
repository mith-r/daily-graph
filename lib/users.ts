import "server-only";
import bcrypt from "bcryptjs";
import { getRedis } from "./redis";
import { DEBUG_USER } from "./debug";
import type { AvatarConfig, FriendSummary, PublicUser, User } from "./types";

const BCRYPT_ROUNDS = 10;

const userKey = (id: string) => `user:${id}`;
const emailKey = (email: string) => `user:email:${email.toLowerCase()}`;
const usernameKey = (username: string) =>
  `user:username:${username.toLowerCase()}`;
const friendsKey = (id: string) => `user:${id}:friends`;
const incomingKey = (id: string) => `user:${id}:incoming`;
const outgoingKey = (id: string) => `user:${id}:outgoing`;
const ALL_USERS_KEY = "users:all";

function toPublic(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
  };
}

function toSummary(u: User): FriendSummary {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const redis = getRedis();
  const u = await redis.get<User>(userKey(id));
  return u ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const redis = getRedis();
  const id = await redis.get<string>(emailKey(email));
  if (!id) return null;
  return getUserById(id);
}

export async function createUser(input: {
  email: string;
  username: string;
  displayName: string;
  password: string;
}): Promise<User | { error: string }> {
  const redis = getRedis();
  const email = input.email.toLowerCase();
  const username = input.username.toLowerCase();

  const tempId = crypto.randomUUID();

  // Reserve email first.
  const emailReserved = await redis.set(emailKey(email), tempId, { nx: true });
  if (emailReserved !== "OK") {
    return { error: "An account with that email already exists." };
  }

  // Reserve username; roll back email on failure.
  const usernameReserved = await redis.set(usernameKey(username), tempId, {
    nx: true,
  });
  if (usernameReserved !== "OK") {
    await redis.del(emailKey(email));
    return { error: "That username is taken." };
  }

  const user: User = {
    id: tempId,
    email,
    username,
    displayName: input.displayName.trim(),
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    createdAt: Date.now(),
  };
  await redis.set(userKey(tempId), user);
  await redis.sadd(ALL_USERS_KEY, tempId);
  return user;
}

export async function verifyPassword(
  user: User,
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

// Idempotently seed the fixed Debug User used by the DEBUG_BYPASS_AUTH flow.
// Registers it in the same indexes as a normal account so it shows up in
// friend search and "all users". Has no usable password (login via password
// is impossible; it's reachable only through the bypass).
export async function ensureDebugUser(): Promise<User> {
  const existing = await getUserById(DEBUG_USER.id);
  if (existing) return existing;
  const redis = getRedis();
  const user: User = {
    ...DEBUG_USER,
    passwordHash: "",
    createdAt: Date.now(),
  };
  await Promise.all([
    redis.set(userKey(user.id), user),
    redis.set(emailKey(user.email), user.id),
    redis.set(usernameKey(user.username), user.id),
    redis.sadd(ALL_USERS_KEY, user.id),
  ]);
  return user;
}

export async function updateDisplayName(
  userId: string,
  displayName: string
): Promise<{ ok: true } | { error: string }> {
  const redis = getRedis();
  const user = await getUserById(userId);
  if (!user) return { error: "User not found." };
  user.displayName = displayName.trim();
  await redis.set(userKey(userId), user);
  return { ok: true };
}

export async function updateAvatar(
  userId: string,
  config: AvatarConfig
): Promise<{ ok: true } | { error: string }> {
  const redis = getRedis();
  const user = await getUserById(userId);
  if (!user) return { error: "User not found." };
  user.avatar = config;
  await redis.set(userKey(userId), user);
  return { ok: true };
}

// Batch-load avatars for a set of user ids (e.g. the friends on today's graph)
// in a single round trip. This runs on the hot /api/today poll path (refreshed
// every few seconds), so MGET keeps it to one request regardless of friend
// count. Order is preserved; returns undefined for ids whose user is missing or
// hasn't designed a face.
export async function getUserAvatars(
  ids: string[]
): Promise<Map<string, AvatarConfig | undefined>> {
  const map = new Map<string, AvatarConfig | undefined>();
  if (ids.length === 0) return map;
  const redis = getRedis();
  const users = await redis.mget<(User | null)[]>(ids.map((id) => userKey(id)));
  ids.forEach((id, i) => map.set(id, users[i]?.avatar ?? undefined));
  return map;
}

export async function updateUsername(
  userId: string,
  newUsername: string
): Promise<{ ok: true } | { error: string }> {
  const redis = getRedis();
  const user = await getUserById(userId);
  if (!user) return { error: "User not found." };
  const next = newUsername.trim().toLowerCase();
  if (next === user.username) return { ok: true };

  const claimed = await redis.set(usernameKey(next), userId, { nx: true });
  if (claimed !== "OK") return { error: "That username is taken." };

  const old = user.username;
  user.username = next;
  await redis.set(userKey(userId), user);
  await redis.del(usernameKey(old));
  return { ok: true };
}

// --- Friends ---

export async function listFriends(userId: string): Promise<FriendSummary[]> {
  const redis = getRedis();
  const ids = await redis.smembers(friendsKey(userId));
  return loadSummaries(ids);
}

export async function listIncomingRequests(
  userId: string
): Promise<FriendSummary[]> {
  const redis = getRedis();
  const ids = await redis.smembers(incomingKey(userId));
  return loadSummaries(ids);
}

export async function listOutgoingRequests(
  userId: string
): Promise<FriendSummary[]> {
  const redis = getRedis();
  const ids = await redis.smembers(outgoingKey(userId));
  return loadSummaries(ids);
}

export async function getFriendIds(userId: string): Promise<Set<string>> {
  const redis = getRedis();
  const ids = await redis.smembers(friendsKey(userId));
  return new Set(ids);
}

export async function countIncomingRequests(userId: string): Promise<number> {
  const redis = getRedis();
  return redis.scard(incomingKey(userId));
}

async function loadSummaries(ids: string[]): Promise<FriendSummary[]> {
  if (ids.length === 0) return [];
  const redis = getRedis();
  const users = await Promise.all(
    ids.map((id) => redis.get<User>(userKey(id)))
  );
  return users.filter((u): u is User => !!u).map(toSummary);
}

export async function listAllUsers(): Promise<FriendSummary[]> {
  const redis = getRedis();
  let ids = await redis.smembers(ALL_USERS_KEY);
  if (ids.length === 0) {
    ids = await backfillAllUsers();
  }
  return loadSummaries(ids);
}

async function backfillAllUsers(): Promise<string[]> {
  const redis = getRedis();
  const ids: string[] = [];
  let cursor = "0";
  do {
    const result = (await redis.scan(cursor, {
      match: "user:email:*",
      count: 500,
    })) as [string, string[]];
    cursor = result[0];
    const keys = result[1];
    if (keys.length > 0) {
      const values = await Promise.all(
        keys.map((k) => redis.get<string>(k))
      );
      for (const id of values) if (id) ids.push(id);
    }
  } while (cursor !== "0");
  if (ids.length > 0) {
    await redis.sadd(ALL_USERS_KEY, ids[0], ...ids.slice(1));
  }
  return ids;
}

export async function sendFriendRequestToUser(
  fromUserId: string,
  toUser: User
): Promise<{ ok: true } | { error: string }> {
  if (toUser.id === fromUserId) return { error: "You can't friend yourself." };

  const redis = getRedis();
  const already = await redis.sismember(friendsKey(fromUserId), toUser.id);
  if (already) return { error: "You're already friends." };

  // If they've already sent a request to us, auto-accept.
  const pending = await redis.sismember(incomingKey(fromUserId), toUser.id);
  if (pending) {
    await acceptFriendRequest(fromUserId, toUser.id);
    return { ok: true };
  }

  const outgoing = await redis.sismember(outgoingKey(fromUserId), toUser.id);
  if (outgoing) return { error: "Request already sent." };

  await Promise.all([
    redis.sadd(outgoingKey(fromUserId), toUser.id),
    redis.sadd(incomingKey(toUser.id), fromUserId),
  ]);
  return { ok: true };
}

export async function acceptFriendRequest(
  userId: string,
  requesterId: string
): Promise<{ ok: true } | { error: string }> {
  const redis = getRedis();
  const isIncoming = await redis.sismember(incomingKey(userId), requesterId);
  if (!isIncoming) return { error: "No such request." };

  await Promise.all([
    redis.srem(incomingKey(userId), requesterId),
    redis.srem(outgoingKey(requesterId), userId),
    redis.sadd(friendsKey(userId), requesterId),
    redis.sadd(friendsKey(requesterId), userId),
  ]);
  return { ok: true };
}

export async function declineFriendRequest(
  userId: string,
  requesterId: string
): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.srem(incomingKey(userId), requesterId),
    redis.srem(outgoingKey(requesterId), userId),
  ]);
}

export async function cancelOutgoingRequest(
  userId: string,
  targetId: string
): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.srem(outgoingKey(userId), targetId),
    redis.srem(incomingKey(targetId), userId),
  ]);
}

export async function removeFriend(
  userId: string,
  friendId: string
): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.srem(friendsKey(userId), friendId),
    redis.srem(friendsKey(friendId), userId),
  ]);
}

export { toPublic };
