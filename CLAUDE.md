@AGENTS.md

# Roundpics

World Cup 2026 prediction SaaS — small private leagues (family/friends) compete on group rankings, knockouts, and finals.

- **Timeline:** WC 2026 runs 2026-06-11 → 2026-07-19. MVP target: free, before group stage starts.
- **Stack:** Next.js 16.2.4 (App Router) · React 19.2.4 · Supabase (Postgres + RLS + Auth via `@supabase/ssr`) · TypeScript.
- **External data:** football-data.org v4 (free tier, **10 req/min**) for teams + fixtures.

## Next.js 16 — read before coding

`AGENTS.md` is not a formality. Conventions changed from prior versions; check `node_modules/next/dist/docs/` before assuming an API exists.

Concrete differences in use here:

- **Middleware is `src/proxy.ts`**, not `middleware.ts`. The exported function is `proxy`, not `middleware`. Edit [src/proxy.ts](src/proxy.ts) for auth gating.
- `params` in route handlers and pages is a `Promise` — `await params` before destructuring (see [src/app/(app)/groups/[groupId]/admin/page.tsx](<src/app/(app)/groups/[groupId]/admin/page.tsx>)).

## Three Supabase clients — pick the right one

| Client               | File                                                                 | When                                                                                        |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Browser              | [src/lib/supabase/client.ts](src/lib/supabase/client.ts)             | `"use client"` components doing user-scoped reads/writes (RLS applies).                     |
| Server (SSR)         | [src/lib/supabase/server.ts](src/lib/supabase/server.ts)             | Server components, route handlers needing `auth.getUser()` and RLS.                         |
| Admin (service role) | [src/lib/supabase/server-admin.ts](src/lib/supabase/server-admin.ts) | Server-only, **bypasses RLS**. For sync jobs, admin writes, cross-user reads. Never expose. |

Never `import` `server-admin.ts` from client code. Authorize the user via the SSR client first (`auth.getUser()` + ownership check), then escalate with the admin client. Pattern: [src/app/api/admin/results/groups/route.ts](src/app/api/admin/results/groups/route.ts).

Profiles RLS has no INSERT policy — inserts go through `handle_new_user` trigger (security definer). If a profile row is missing for an existing user (e.g. after schema drop/recreate), use the admin client to upsert. See `src/app/(app)/layout.tsx`.

## RLS — recursion trap

`group_members` policies that reference `group_members` recurse. The schema works around this with `security definer` SQL functions:

- `public.get_my_group_ids()` — returns the caller's group IDs, bypassing RLS.
- `public.can_join_group(p_group_id)` — capacity check, bypasses RLS.

When adding a new table scoped to a group, use `group_id in (select public.get_my_group_ids())` in the policy. Don't query `group_members` directly. See [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).

Profiles RLS only allows `auth.uid() = id` for select/update — to fetch other members' display names use the admin client.

## Phase-based prediction model

Two active phases. `finals_picks` table is **dropped** — it no longer exists.

| Phase | What's locked | How it locks |
| ----- | ------------- | ------------ |
| 1 | `group_picks` + `best_third_picks` (rank 1/2/3 per WC group A–L, + 8 best 3rd picks) | Auto: `now() >= MIN(kickoff_at) WHERE round='GROUP'`. Manual override: `phase1_locked` flag on `groups` row. |
| 2 | `knockout_picks` (R32 → FINAL) | Per-match: `now() < wc_matches.kickoff_at` checked at INSERT/UPDATE in RLS. |

The `phase1_open_for_group(p_group_id)` SQL function (security definer) combines both checks. `phase2_locked` and `phase3_locked` columns still exist on the `groups` table but are unused — do not reintroduce logic for them.

Admin panel only exposes Phase 1 emergency lock/unlock. Everything else is automatic.

## Scoring

Implemented in [src/lib/scoring.ts](src/lib/scoring.ts). Pure functions, no DB calls — caller fetches picks + official results and passes them in. `ROUND_POINTS` is exported.

| Phase                             | Rule                        | Points                |
| --------------------------------- | --------------------------- | --------------------- |
| Group                             | Correct team + correct rank | +2                    |
| Group                             | Correct team, wrong rank    | +1                    |
| Best 3rd                          | Team in official top 8      | +2 each               |
| R32 / R16 / QF / SF / 3rd / Final | Correct winner              | 1 / 2 / 3 / 4 / 3 / 5 |

Knockout scoring only counts `status = 'finished'` matches with both scores set.

## football-data.org sync

[src/lib/matches-api.ts](src/lib/matches-api.ts) exposes `syncWC2026All()` — **3 API calls**: `/teams`, `/matches`, `/standings`. Group letters for teams are derived from `match.group` field. `ROUND_MAP` includes `GROUP_STAGE → "GROUP"` (stored in `wc_matches` for auto-deadline).

[src/app/api/matches/sync/route.ts](src/app/api/matches/sync/route.ts):
- Enforces **5-minute cooldown** via `MAX(updated_at)` from `wc_matches`. Returns 429 if too soon.
- Secured by `x-cron-secret` header (requests without the header = manual admin call, allowed).
- **Auto-populates** `wc_group_results` from standings data.
- **Auto-detects** `is_best_third` on 8 teams from intersection of 3rd-place group teams + R32 fixture teams.

**Automated sync:** GitHub Actions cron (`*/10 * * * *`) in `.github/workflows/sync-matches.yml` — Vercel Hobby plan doesn't support sub-daily crons. Secrets required: `APP_URL`, `CRON_SECRET`.

`ROUND_MAP` values: `GROUP`, `R32`, `R16`, `QF`, `SF`, `3RD`, `FINAL`.

## Score visualization on predict page

`src/app/(app)/groups/[groupId]/predict/page.tsx` computes scores server-side and passes them down:
- Total score card shown when any points exist.
- `PredictForm`: per-group score badge (+X pts) and per-rank badge (+2/+1/✗).
- `BestThirdForm`: ✓/✗/missed per team, score tag.
- `KnockoutForm`: per-match points badge (+N pts or ✗), auto-save on pick with optimistic UI.

## Predict page step flow

`PredictForm` controls a `step` state (1 | 2):
- Step 1: Group Rankings (Groups A–L, pick 1st/2nd/3rd)
- Step 2: BestThirdForm (pick 8 best 3rd-place qualifiers)

`step` initialises to `2` if user already has saved best_third picks. "Edit picks" in BestThirdForm calls `onBack()` → `setStep(1)`. When navigating forward to Step 2 with existing picks, `bestThirdEditMode=true` is passed to BestThirdForm so it opens in editable state (not locked "Saved ✓" view).

## Team flags — frontend only

Flag emojis live in [src/lib/team-flags.ts](src/lib/team-flags.ts) as a `name → emoji` map for the **48 likely WC 2026 qualifiers**. Always render via `getFlag(team.name)`.

- Do **not** add an `emoji_flag` column to `wc_teams` — it was removed deliberately.
- The map includes alias keys for football-data.org name variants (`USA`/`United States`, `Türkiye`/`Turkey`, `Korea Republic`/`South Korea`, `Côte d'Ivoire`/`Ivory Coast`).
- Unknown name → returns `🏳️`.

## Directory layout

```
src/
  proxy.ts                     # Next.js 16 middleware (auth gate)
  app/
    (auth)/                    # /login /signup /forgot-password /reset-password
    (app)/                     # auth-required: /dashboard /groups/...
      groups/[groupId]/
        page.tsx               # group home + leaderboard
        predict/               # PredictForm (Step1: groups, Step2: BestThird) → KnockoutForm
        admin/                 # creator-only: phase1 emergency lock, phase2 info
    api/
      matches/sync/            # POST: pull from football-data.org (5-min cooldown, auto-results)
      teams/groups/            # PATCH: manual group letter overrides
      feedback/                # POST: collect user feedback
    auth/callback/             # OAuth/magic-link return
  lib/
    matches-api.ts             # syncWC2026All (3 API calls)
    scoring.ts                 # pure scoring fns, exports ROUND_POINTS
    team-flags.ts              # getFlag(name)
    supabase/{client,server,server-admin,types}.ts
.github/workflows/sync-matches.yml  # GitHub Actions cron every 10 min
supabase/migrations/001_initial_schema.sql
```

## Conventions

- **Server component → admin write:** verify `user.id === group.creator_id` with the SSR client first; only then use `createAdminClient()`.
- **Page params:** `interface Props { params: Promise<{ groupId: string }> }` then `const { groupId } = await params;`.
- **Type cast Supabase joins:** nested selects (e.g. `groups(*, events(name))`) often need an `as` cast — Supabase's generated types treat joined relations as arrays.
- **Don't store derivable data:** flags, scores from picks — keep the DB minimal.
- **No comments unless the WHY is non-obvious.** The codebase is intentionally lean.
- **Admin results are auto-synced** — do not reintroduce manual group results or best-third entry forms. The sync endpoint handles it.
- **Profile upsert:** profiles table has no INSERT RLS policy. Always use the admin client to create/fix missing profiles.
