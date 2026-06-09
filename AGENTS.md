<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Always end with a dev server to check the work

At the end of **every** request in this project, leave the user a running local
dev server and give them the URL as the last thing in your reply, so they can
check the work out.

- Start it with the local-dev flags (see `README.md` → "Local development
  flags"): `USE_IN_MEMORY_REDIS=1 DEBUG_BYPASS_AUTH=1 npx next dev -p <port>`.
  `SESSION_SECRET` is already in `.env.local`. These flags are **local-only** —
  never set them in preview/production.
- Multiple Conductor workspaces run in parallel and may already hold a port
  (e.g. 3000). Pick a free port rather than killing another workspace's server,
  and never stop a `next-server` whose working directory is a different
  workspace.
- Run it in the background, confirm it has compiled and is ready, then give the
  user the full URL (e.g. `http://localhost:3005`).
