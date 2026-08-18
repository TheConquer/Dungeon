---
name: deploy-dashboard-iphone
description: Deploy code changes for the dashboard-inventory-iphone project (Railway-hosted iPhone inventory/service dashboard, GitHub repo TheConquer/Dungeon) — commit, push, wait for Railway to auto-redeploy, and verify it actually went live. Use this whenever a code change has just been made to this project and needs to reach production, or when checking whether a recent push already deployed. Also covers what to do when the change touches backend/src/db/schema.sql (new table or column), and why "seems broken" reports right after a deploy are usually just a stale login session, not a real bug.
---

# Deploy dashboard-inventory-iphone

This project runs on Railway (`https://dashboard-inventory-iphone-production.up.railway.app/`), auto-deploying from GitHub repo `TheConquer/Dungeon` on every push to `main`. The repo is cloned locally at `C:\Users\jordan\Documents\dashboard-inventory-iphone`.

## Deploy steps

1. **Commit and push.** Stage the changed files (avoid `git add -A` if untracked files that don't belong are present), write a commit message explaining *why* the change was made, and push:
   ```bash
   git add <files>
   git commit -m "$(cat <<'EOF'
   <summary>

   <why, if not obvious>

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   EOF
   )"
   git push origin main
   ```

2. **Wait for Railway to redeploy**, without blocking other work. It typically takes 60-90 seconds (init + build + deploy):
   ```bash
   for i in $(seq 1 12); do sleep 6; done; echo done
   ```
   Run this with `run_in_background: true` (or your environment's equivalent) so you can keep working while it finishes.

3. **Verify the deploy actually landed** — don't just assume the push worked:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://dashboard-inventory-iphone-production.up.railway.app/api/health
   ```
   200 means the new container is up and answering. If a route you just added still 404s or behaves like the old code, the deploy may simply not be finished yet — wait a bit longer before concluding something's broken.

## Sessions die on every redeploy — this causes most "it's broken" confusion

Sessions are stored **in memory** on the server, not in a database — a deliberate simplicity trade-off for this small-team app. Every redeploy restarts the container, which wipes *all* logged-in sessions, including any `curl` session used for testing the API.

- If there was a session cookie from before the deploy, it's dead now. Re-login before making more authenticated API calls:
  ```bash
  curl -s -c /tmp/cookie.txt -X POST https://dashboard-inventory-iphone-production.up.railway.app/api/auth/login \
    -H "Content-Type: application/json" -d '{"username":"<username>","password":"<password>"}'
  ```
- Tell the user they'll need to refresh their browser and log in again too if they're actively testing. During this project's development, several "this feature seems broken" reports turned out to just be a stale session right after a deploy — worth ruling out first before a deep debugging session, since it's a one-line check versus potentially hours of chasing a bug that isn't there.

## If the change touched backend/src/db/schema.sql

`schema.sql` uses `CREATE TABLE IF NOT EXISTS`, which is a no-op against the production Neon database for anything that already exists — so a brand-new *column* on an existing table (or a brand-new table, the first time) doesn't apply itself just because it's sitting in the file. It has to actually be run against production.

- New table: `CREATE TABLE IF NOT EXISTS` is sufficient on its own — it creates the table the first time the migration runs.
- New column on an existing table: needs an explicit `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` (a `CREATE TABLE IF NOT EXISTS` block won't retroactively add columns to a table that's already there).

There's no Node.js installed anywhere locally, so the only practical way to actually run the migration is via Railway's own Console (which has Node built in):

1. Railway dashboard → the service → **Console** tab.
2. Run:
   ```bash
   cd backend && npm run db:init -- --no-seed
   ```
   `--no-seed` matters — without it, the seed step can overwrite real production data with sample data.
3. Look for `Schema OK` in the output.

Do this *after* the deploy finishes, not before — the Console runs inside the currently-deployed container, so it needs the new `schema.sql` to already be live to pick up the new migration statements.

## Context worth knowing

- This is a solo/small-team shop tool with no staging environment — every push to `main` goes straight to the live production database and the live production URL. There's no dry-run or safe rehearsal step; that's exactly why the verify-after-deploy habit above matters.
- No automated tests exist for this project. Treat "deployed" as "the container is running the new code," not "verified correct" — for anything UI-facing, ask the user to click through it after the deploy, or check directly via the API if session credentials are available.
