# Setup & local development

Operational reference for running The Daily Graphs locally and deploying it. For the project
overview and architecture, see the [README](./README.md).

## Quickstart

Prerequisites: **Node 20+**. No database or email account is required for local development —
the in-memory store and auth bypass cover everything.

```bash
USE_IN_MEMORY_REDIS=1 DEBUG_BYPASS_AUTH=1 SESSION_SECRET=$(openssl rand -hex 32) npx next dev -p 3004
```

Open <http://localhost:3004>. Every request is treated as a seeded "Debug User" and demo data is
auto-seeded on boot.

To enable the `/admin` dashboard for the debug user, add `ADMIN_EMAILS`:

```bash
USE_IN_MEMORY_REDIS=1 DEBUG_BYPASS_AUTH=1 ADMIN_EMAILS=debug@example.com SESSION_SECRET=$(openssl rand -hex 32) npx next dev -p 3004
```

Then visit `/admin` after browsing the app for at least one heartbeat interval to see aggregate
DAU and active-time metrics.

## Local development flags (dev only)

> [!CAUTION]
> **Always disable these before deploying.** Both env vars are for local development only.
> `DEBUG_BYPASS_AUTH` turns off authentication entirely (anyone hitting the site becomes the
> "Debug User"), and `USE_IN_MEMORY_REDIS` throws away all real data by swapping the database for
> an ephemeral in-process store. Never set either in production / preview deployments — make sure
> they are unset in your Vercel project environment variables.

| Env var | Effect | Safe for prod? |
| --- | --- | --- |
| `DEBUG_BYPASS_AUTH=1` | Bypass login; every unauthenticated request acts as a seeded "Debug User". An amber banner is shown site-wide while it's on. | ❌ Never |
| `USE_IN_MEMORY_REDIS=1` | Replace Upstash Redis with an in-memory stub (no install needed) and auto-seed demo data on boot. | ❌ Never |
| `ADMIN_EMAILS=person@example.com,other@example.com` | Grants `/admin` access to matching authenticated users. Use `debug@example.com` for the local debug user. | ✅ Yes |

When either dev flag is active the server logs a loud warning at startup, and the debug bypass
renders a persistent banner in the UI — both as reminders to turn them off.

## Email (verification codes & password reset)

Accounts must verify their email with a 6-digit code before using the app, and the same mechanism
powers the forgot-password flow. Emails are sent through [Resend](https://resend.com).

| Env var | Effect | Required in prod? |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend API key. **When unset, codes are printed to the server console instead of emailed** — local dev needs zero email setup. | ✅ Yes |
| `EMAIL_FROM` | Sender for verification/reset emails, e.g. `Daily Graphs <no-reply@yourdomain.com>`. Must be a Resend-verified domain. | ✅ Yes |

Locally, just run the dev command above and watch the terminal for the framed `[email] DEV MODE`
block containing the code.

## Environment variables

| Env var | Purpose | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | Signing key for `jose` JWT sessions | Required. 32+ chars. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis connection | Required in prod (or the Vercel KV equivalents `KV_REST_API_URL` / `KV_REST_API_TOKEN`). |
| `RESEND_API_KEY` | Resend API key for outbound email | Falls back to console output when unset. |
| `EMAIL_FROM` | Sender address for verification/reset emails | Resend-verified domain. |
| `ADMIN_EMAILS` | Comma-separated admin allowlist for `/admin` | Optional. |
| `CRON_SECRET` | Bearer token authorizing the daily push cron | Required for the cron route in prod. |
| `USE_IN_MEMORY_REDIS` | Swap Redis for the in-memory stub | **Dev only — never in prod.** |
| `DEBUG_BYPASS_AUTH` | Disable auth; treat all requests as the debug user | **Dev only — never in prod.** |

## Deploy

The app deploys to [Vercel](https://vercel.com). A daily Cron job (`vercel.json`) calls
`/api/cron/push` at `0 13 * * *` (13:00 UTC) to fan out APNs push notifications; it authorizes
with `CRON_SECRET`.

> [!CAUTION]
> Before deploying, double-check that **`DEBUG_BYPASS_AUTH` and `USE_IN_MEMORY_REDIS` are unset**
> in every deployed environment (production and preview). Leaving `DEBUG_BYPASS_AUTH` on disables
> authentication for everyone; leaving `USE_IN_MEMORY_REDIS` on serves an empty, non-persistent
> database.
