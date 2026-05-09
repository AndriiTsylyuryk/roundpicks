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

## RLS — recursion trap

`group_members` policies that reference `group_members` recurse. The schema works around this with `security definer` SQL functions:

- `public.get_my_group_ids()` — returns the caller's group IDs, bypassing RLS.
- `public.can_join_group(p_group_id)` — capacity check, bypasses RLS.

When adding a new table scoped to a group, use `group_id in (select public.get_my_group_ids())` in the policy. Don't query `group_members` directly. See [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).

Profiles RLS only allows `auth.uid() = id` for select — to fetch other members' display names use the admin client.

## Phase-based prediction model

Each group (the betting league, not WC group) has three lock flags on the `groups` row:

| Phase | Flag            | What's locked when true                      |
| ----- | --------------- | -------------------------------------------- |
| 1     | `phase1_locked` | `group_picks` (1st/2nd/3rd per WC group A–L) |
| 2     | `phase2_locked` | `best_third_picks` + `knockout_picks`        |
| 3     | `phase3_locked` | `finals_picks`                               |

The lock is enforced **in RLS policies** (insert/update `with check` clauses query `groups.phaseN_locked`), not just in UI. The group page banner reflects the next open phase, not just phase 1 — see [src/app/(app)/groups/[groupId]/page.tsx](<src/app/(app)/groups/[groupId]/page.tsx>).

## Scoring

Implemented in [src/lib/scoring.ts](src/lib/scoring.ts). Pure functions, no DB calls — caller fetches picks + official results and passes them in.

| Phase                             | Rule                        | Points                |
| --------------------------------- | --------------------------- | --------------------- |
| Group                             | Correct team + correct rank | +2                    |
| Group                             | Correct team, wrong rank    | +1                    |
| Best 3rd                          | Team in official top 8      | +2 each               |
| R32 / R16 / QF / SF / 3rd / Final | Correct winner              | 1 / 2 / 3 / 4 / 3 / 5 |

Knockout scoring only counts `status = 'finished'` matches with both scores set.

## football-data.org sync

[src/lib/matches-api.ts](src/lib/matches-api.ts) exposes a single `syncWC2026All()` — **2 API calls** (`/teams` + `/matches`). Group letters for teams are derived from the `match.group` field, not a separate endpoint. Never reintroduce a 3rd call.

[src/app/api/matches/sync/route.ts](src/app/api/matches/sync/route.ts) enforces a **5-minute cooldown** by reading `MAX(updated_at)` from `wc_matches` before calling the API. Returns 429 if too soon. Skipped on first sync (empty table).

`ROUND_MAP` translates football-data stages → our `wc_matches.round` values (`R32`, `R16`, `QF`, `SF`, `3RD`, `FINAL`).

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
        predict/               # PredictForm (groups) → BestThirdForm → KnockoutForm → FinalsForm
        admin/                 # creator-only: sync, lock phases, enter results
    api/
      matches/sync/            # POST: pull from football-data.org (5-min cooldown)
      teams/groups/            # PATCH: manual group letter overrides
      admin/results/groups/    # POST: official group standings (creator-only)
      admin/results/best-third # POST: official 8 third-placers
      feedback/                # POST: collect user feedback
    auth/callback/             # OAuth/magic-link return
  lib/
    matches-api.ts             # syncWC2026All
    scoring.ts                 # pure scoring fns
    team-flags.ts              # getFlag(name)
    supabase/{client,server,server-admin,types}.ts
supabase/migrations/001_initial_schema.sql
```

## Conventions

- **Server component → admin write:** verify `user.id === group.creator_id` with the SSR client first; only then use `createAdminClient()`.
- **Page params:** `interface Props { params: Promise<{ groupId: string }> }` then `const { groupId } = await params;`.
- **Type cast Supabase joins:** nested selects (e.g. `groups(*, events(name))`) often need an `as` cast — Supabase's generated types treat joined relations as arrays.
- **Don't store derivable data:** flags, scores from picks — keep the DB minimal.
- **No comments unless the WHY is non-obvious.** The codebase is intentionally lean.
