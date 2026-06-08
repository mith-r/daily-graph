import "server-only";

// --- Debug auth bypass ---
//
// When DEBUG_BYPASS_AUTH is truthy, every otherwise-unauthenticated request is
// treated as a fixed "Debug User", so the whole site can be used without
// logging in. Enable it by setting the env var (e.g. in .env.local):
//
//   DEBUG_BYPASS_AUTH=1
//
// SECURITY: this disables authentication entirely. NEVER set it in a real
// production deployment — anyone hitting the site becomes the Debug User.
export const DEBUG_AUTH_ENABLED =
  process.env.DEBUG_BYPASS_AUTH === "1" ||
  process.env.DEBUG_BYPASS_AUTH === "true";

// Fixed identity used by the bypass. Seeded into Redis on first use (see
// ensureDebugUser in lib/users.ts) so it behaves like a real, friendable
// account rather than a phantom id.
export const DEBUG_USER = {
  id: "debug-user",
  email: "debug@example.com",
  username: "debug",
  displayName: "Debug User",
} as const;

if (DEBUG_AUTH_ENABLED) {
  console.warn(
    "⚠️  DEBUG_BYPASS_AUTH is enabled — authentication is bypassed; " +
      "unauthenticated requests act as the Debug User. Do NOT use in production."
  );
}
