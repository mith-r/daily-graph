This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

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

Run the app locally without a real database or login, e.g. on port 3004:

```bash
USE_IN_MEMORY_REDIS=1 DEBUG_BYPASS_AUTH=1 SESSION_SECRET=<32+ char string> npx next dev -p 3004
```

When either flag is active the server logs a loud warning at startup, and the
debug bypass renders a persistent banner in the UI — both as reminders to turn
them off.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

> [!CAUTION]
> Before deploying, double-check that **`DEBUG_BYPASS_AUTH` and
> `USE_IN_MEMORY_REDIS` are unset** in every deployed environment (production
> and preview). See [Local development flags](#local-development-flags-dev-only).
> Leaving `DEBUG_BYPASS_AUTH` on disables authentication for everyone; leaving
> `USE_IN_MEMORY_REDIS` on serves an empty, non-persistent database.
