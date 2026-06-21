# Daily Graph

A new graph every day. Place yourself on the day's prompt, then see where your
friends — and the world — landed. A [Next.js](https://nextjs.org) app, also
shipped as an iOS app via [Capacitor](https://capacitorjs.com)
(see [`docs/IOS_SETUP.md`](docs/IOS_SETUP.md)).

## Getting Started

Run the app locally with no database or login setup using the local-dev flags
below — that is the canonical way to develop. See
[Local development flags](#local-development-flags-dev-only).

```bash
USE_IN_MEMORY_REDIS=1 DEBUG_BYPASS_AUTH=1 SESSION_SECRET=<32+ char string> npx next dev -p 3004
```

Then open [http://localhost:3004](http://localhost:3004).

## Local development flags (dev only)

> [!CAUTION]
> **Always disable these before deploying.** Both env vars are for local
> development only. `DEBUG_BYPASS_AUTH` turns off authentication entirely
> (anyone hitting the site becomes the "Debug User"), and `USE_IN_MEMORY_REDIS`
> throws away all real data by swapping the database for an ephemeral
> in-process store. Never set either in production / preview deployments — make
> sure they are unset in your Vercel project environment variables.

| Env var | Effect | Safe for prod? |
| --- | --- | --- |
| `DEBUG_BYPASS_AUTH=1` | Bypass login; every unauthenticated request acts as a seeded "Debug User". An amber banner is shown site-wide while it's on. | ❌ Never |
| `USE_IN_MEMORY_REDIS=1` | Replace Upstash Redis with an in-memory stub (no install needed) and auto-seed demo data on boot. | ❌ Never |
| `ADMIN_EMAILS=person@example.com,other@example.com` | Grants `/admin` access to matching authenticated users. Use `debug@example.com` for the local debug user. | ✅ Yes |

Run the same local mode with the admin dashboard enabled for the seeded debug
user:

```bash
USE_IN_MEMORY_REDIS=1 DEBUG_BYPASS_AUTH=1 ADMIN_EMAILS=debug@example.com SESSION_SECRET=<32+ char string> npx next dev -p 3004
```

Then visit `/admin` after browsing the app for at least one heartbeat interval
to see aggregate DAU and active-time metrics.

When either flag is active the server logs a loud warning at startup, and the
debug bypass renders a persistent banner in the UI — both as reminders to turn
them off.

## Email (verification codes & password reset)

Accounts must verify their email with a 6-digit code before using the app, and
the same mechanism powers the forgot-password flow. Emails are sent through
[Resend](https://resend.com).

| Env var | Effect | Required in prod? |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend API key. **When unset, codes are printed to the server console instead of emailed** — local dev needs zero email setup. | ✅ Yes |
| `EMAIL_FROM` | Sender for verification/reset emails, e.g. `Daily Graphs <no-reply@yourdomain.com>`. Must be a Resend-verified domain. | ✅ Yes |

Locally, just run the dev command above and watch the terminal for the framed
`[email] DEV MODE` block containing the code.

## Before deploying

> [!CAUTION]
> Double-check that **`DEBUG_BYPASS_AUTH` and `USE_IN_MEMORY_REDIS` are unset**
> in every deployed environment (production and preview). See
> [Local development flags](#local-development-flags-dev-only). Leaving
> `DEBUG_BYPASS_AUTH` on disables authentication for everyone; leaving
> `USE_IN_MEMORY_REDIS` on serves an empty, non-persistent database.

Deploy on [Vercel](https://vercel.com) like any other Next.js app. The required
production env vars are `SESSION_SECRET`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, and `EMAIL_FROM`.
