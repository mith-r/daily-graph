// In-memory stand-in for the Upstash Redis REST client, used ONLY for local
// development when USE_IN_MEMORY_REDIS=1 (see lib/redis.ts). It implements just
// the command surface this app uses, with the same return-value shapes as
// @upstash/redis, so the rest of the code is unaware of the swap.
//
// Not for production: no persistence (data lives in process memory), no TTLs
// (expire is a no-op), and scan returns everything in a single page.
//
// The backing store is pinned to globalThis so every module/runtime instance in
// the dev server shares one store (instrumentation seeding + request handlers).

type Hash = Map<string, unknown>;
type ZSet = Map<string, number>; // member -> score

type Store = Map<string, unknown>;

const g = globalThis as unknown as { __memRedisStore?: Store };
const store: Store = g.__memRedisStore ?? (g.__memRedisStore = new Map());

function clone<T>(v: T): T {
  if (v === null || typeof v !== "object") return v;
  return structuredClone(v);
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function resolveIndex(i: number, len: number): number {
  return i < 0 ? len + i : i;
}

class MemoryRedis {
  async get<T = unknown>(key: string): Promise<T | null> {
    return store.has(key) ? (clone(store.get(key)) as T) : null;
  }

  async set(
    key: string,
    value: unknown,
    opts?: { nx?: boolean; ex?: number }
  ): Promise<"OK" | null> {
    if (opts?.nx && store.has(key)) return null;
    store.set(key, clone(value));
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) if (store.delete(k)) n++;
    return n;
  }

  // --- Hashes ---
  private hash(key: string, create = false): Hash | undefined {
    let h = store.get(key) as Hash | undefined;
    if (!h && create) {
      h = new Map();
      store.set(key, h);
    }
    return h;
  }

  async hget<T = unknown>(key: string, field: string): Promise<T | null> {
    const h = this.hash(key);
    if (!h || !h.has(field)) return null;
    return clone(h.get(field)) as T;
  }

  async hgetall<T = Record<string, unknown>>(key: string): Promise<T | null> {
    const h = this.hash(key);
    if (!h || h.size === 0) return null;
    const out: Record<string, unknown> = {};
    for (const [f, v] of h) out[f] = clone(v);
    return out as T;
  }

  async hset(key: string, obj: Record<string, unknown>): Promise<number> {
    const h = this.hash(key, true)!;
    let added = 0;
    for (const [f, v] of Object.entries(obj)) {
      if (!h.has(f)) added++;
      h.set(f, clone(v));
    }
    return added;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const h = this.hash(key, true)!;
    const current = Number(h.get(field) ?? 0);
    const next = current + increment;
    h.set(field, next);
    return next;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const h = this.hash(key);
    if (!h) return 0;
    let n = 0;
    for (const f of fields) if (h.delete(f)) n++;
    if (h.size === 0) store.delete(key);
    return n;
  }

  async hexists(key: string, field: string): Promise<number> {
    return this.hash(key)?.has(field) ? 1 : 0;
  }

  // --- Sets ---
  private set_(key: string, create = false): Set<string> | undefined {
    let s = store.get(key) as Set<string> | undefined;
    if (!s && create) {
      s = new Set();
      store.set(key, s);
    }
    return s;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const s = this.set_(key, true)!;
    let n = 0;
    for (const m of members)
      if (!s.has(m)) {
        s.add(m);
        n++;
      }
    return n;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const s = this.set_(key);
    if (!s) return 0;
    let n = 0;
    for (const m of members) if (s.delete(m)) n++;
    if (s.size === 0) store.delete(key);
    return n;
  }

  async smembers(key: string): Promise<string[]> {
    const s = this.set_(key);
    return s ? [...s] : [];
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.set_(key)?.has(member) ? 1 : 0;
  }

  async scard(key: string): Promise<number> {
    return this.set_(key)?.size ?? 0;
  }

  // --- Sorted sets ---
  private zset(key: string, create = false): ZSet | undefined {
    let z = store.get(key) as ZSet | undefined;
    if (!z && create) {
      z = new Map();
      store.set(key, z);
    }
    return z;
  }

  private sortedMembers(z: ZSet): string[] {
    return [...z.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member);
  }

  async zadd(
    key: string,
    entry: { score: number; member: string }
  ): Promise<number> {
    const z = this.zset(key, true)!;
    const isNew = !z.has(entry.member);
    z.set(entry.member, entry.score);
    return isNew ? 1 : 0;
  }

  async zcard(key: string): Promise<number> {
    return this.zset(key)?.size ?? 0;
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean }
  ): Promise<string[]> {
    const z = this.zset(key);
    if (!z) return [];
    const members = opts?.rev
      ? this.sortedMembers(z).reverse()
      : this.sortedMembers(z);
    const s = resolveIndex(start, members.length);
    const e = resolveIndex(stop, members.length);
    return members.slice(s, e + 1);
  }

  async zremrangebyrank(
    key: string,
    start: number,
    stop: number
  ): Promise<number> {
    const z = this.zset(key);
    if (!z) return 0;
    const members = this.sortedMembers(z);
    const s = resolveIndex(start, members.length);
    const e = resolveIndex(stop, members.length);
    const toRemove = members.slice(s, e + 1);
    for (const m of toRemove) z.delete(m);
    if (z.size === 0) store.delete(key);
    return toRemove.length;
  }

  // --- Misc ---
  async scan(
    _cursor: string | number,
    opts?: { match?: string; count?: number }
  ): Promise<[string, string[]]> {
    const re = opts?.match ? globToRegExp(opts.match) : null;
    const keys = [...store.keys()].filter((k) => (re ? re.test(k) : true));
    return ["0", keys]; // single page; cursor "0" ends the caller's loop
  }

  async expire(key: string): Promise<number> {
    return store.has(key) ? 1 : 0; // TTLs are a no-op in the dev stub
  }
}

let instance: MemoryRedis | null = null;

export function getMemoryRedis(): MemoryRedis {
  if (!instance) {
    instance = new MemoryRedis();
    console.warn(
      "🧠 USE_IN_MEMORY_REDIS is on — using an ephemeral in-memory Redis stub. " +
        "Data is not persisted. Do NOT use in production."
    );
  }
  return instance;
}
