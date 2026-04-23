# Daily Graphs — Feature TODO

## Social / Core
- [x] **1.** Accounts + friends (only see friends' data points on graph)
- [ ] **2.** Plot friends on the graph instead of yourself
- [ ] **8.** Custom prompts between friends
- [ ] **11.** Notifications when a friend plots you

## Premium / Monetization
- [ ] **3.** Premium: a friend-group member picks the daily graph prompt
- [ ] **4.** Ad-free tier after premium subscription
- [ ] **5.** Pay to move friends around the graph

## Engagement / Retention
- [x] **6.** Streak + history view of past graphs
- [ ] **7.** Private vs. public graph toggle per post
- [ ] **9.** Friend-group averages over time
- [ ] **10.** Year-in-review export
- [ ] **12.** "Guess where your friend plotted themselves" mini-game

## Dependency Notes
- Features 2, 3, 5, 8, 9, 11, 12 all depend on **1 (accounts + friends)** — built.
- Feature 4 depends on having ads + a subscription system (Stripe).
- Feature 10 depends on 6 (history).

## Required env vars (set in `.env.local` for dev, Vercel for prod)
- `SESSION_SECRET` — 32+ char random string. Generate: `openssl rand -base64 32`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (already used)
