<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ⚠️ MANDATORY: end EVERY request with a running dev server

This is a hard requirement, not a suggestion. **Every single request you finish
in this project must end with a running local dev server, and the very last
thing in your reply must be that server's URL** (e.g. `http://localhost:3005`),
so the user can immediately click in and check the work.

Do this on every request — features, bug fixes, refactors, config-only edits,
even questions. If you touched anything in the repo, leave a server running and
end on the URL. Never end a reply without it.

How to start it:

- Use the local-dev flags (see `README.md` → "Local development flags"):
  `USE_IN_MEMORY_REDIS=1 DEBUG_BYPASS_AUTH=1 npx next dev -p <port>`.
  `SESSION_SECRET` is already in `.env.local`. These flags are **local-only** —
  never set them in preview/production.
- Multiple Conductor workspaces run in parallel and may already hold a port
  (e.g. 3000). Pick a free port rather than killing another workspace's server,
  and never stop a `next-server` whose working directory is a different
  workspace.
- Run it in the background, wait until it has compiled and is listening, then
  give the user the full URL as the closing line of your reply.
