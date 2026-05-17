import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncWC2026All } from "@/lib/matches-api";

export async function POST(req: Request) {
  // Requests from the cron job carry x-cron-secret; manual admin syncs do not.
  const cronSecret = process.env.CRON_SECRET;
  const incomingSecret = req.headers.get("x-cron-secret");
  if (incomingSecret !== null) {
    if (!cronSecret || incomingSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Cooldown: skip if synced within the last 5 minutes
  const { data: recentMatch } = await supabase
    .from("wc_matches")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentMatch?.updated_at) {
    const elapsed = Date.now() - new Date(recentMatch.updated_at).getTime();
    if (elapsed < 5 * 60 * 1000) {
      const remaining = Math.ceil((5 * 60 * 1000 - elapsed) / 1000);
      return NextResponse.json(
        { error: `Sync cooldown — try again in ${remaining}s` },
        { status: 429 }
      );
    }
  }

  const { teamsData, matchesData, standingsData, error } = await syncWC2026All();

  if (error) return NextResponse.json({ error }, { status: 500 });

  if (!teamsData || teamsData.length === 0) {
    return NextResponse.json(
      { error: "No team data returned — WC 2026 may not be published yet on football-data.org" },
      { status: 502 }
    );
  }

  // Upsert teams
  const { error: teamsError } = await supabase
    .from("wc_teams")
    .upsert(teamsData, { onConflict: "name" });
  if (teamsError) return NextResponse.json({ error: teamsError.message }, { status: 500 });

  // Build external_id → UUID map for team ID resolution
  const { data: teamsInDb } = await supabase.from("wc_teams").select("id, external_id");
  const teamByExtId: Record<number, string> = {};
  for (const t of teamsInDb ?? []) {
    if (t.external_id) teamByExtId[t.external_id] = t.id;
  }

  // Upsert matches (groups + knockouts)
  let matchesSynced = 0;
  if (matchesData && matchesData.length > 0) {
    const matchRows = matchesData.map((m) => ({
      external_id: m.external_id,
      round: m.round,
      home_team_id: m.home_external_id != null ? (teamByExtId[m.home_external_id] ?? null) : null,
      away_team_id: m.away_external_id != null ? (teamByExtId[m.away_external_id] ?? null) : null,
      home_score: m.home_score,
      away_score: m.away_score,
      status: m.status,
      kickoff_at: m.kickoff_at,
    }));

    const { error: matchesError } = await supabase
      .from("wc_matches")
      .upsert(matchRows, { onConflict: "external_id" });

    if (matchesError) {
      return NextResponse.json({ teams: teamsData.length, matches: 0, matchesWarning: matchesError.message });
    }
    matchesSynced = matchRows.length;
  }

  // Auto-populate group stage results from standings
  let standingsSynced = 0;
  if (standingsData && standingsData.length > 0) {
    const groupResultRows = standingsData.map((s) => ({
      wc_group: s.wc_group,
      rank1_id: teamByExtId[s.rank1_ext_id] ?? null,
      rank2_id: teamByExtId[s.rank2_ext_id] ?? null,
      rank3_id: teamByExtId[s.rank3_ext_id] ?? null,
      updated_at: new Date().toISOString(),
    })).filter((r) => r.rank1_id); // skip groups where we can't resolve team IDs yet

    if (groupResultRows.length > 0) {
      await supabase
        .from("wc_group_results")
        .upsert(groupResultRows, { onConflict: "wc_group" });
      standingsSynced = groupResultRows.length;
    }
  }

  // Auto-detect best third qualifiers:
  // 3rd-place teams that appear in R32 fixtures = the 8 best third-placers
  if (standingsSynced === 12) {
    const { data: groupResults } = await supabase
      .from("wc_group_results")
      .select("rank3_id")
      .not("rank3_id", "is", null);

    const thirdPlaceIds = new Set(
      (groupResults ?? []).map((r: { rank3_id: string }) => r.rank3_id)
    );

    const { data: r32Matches } = await supabase
      .from("wc_matches")
      .select("home_team_id, away_team_id")
      .eq("round", "R32")
      .not("home_team_id", "is", null);

    const r32TeamIds = new Set(
      (r32Matches ?? [])
        .flatMap((m: { home_team_id: string | null; away_team_id: string | null }) =>
          [m.home_team_id, m.away_team_id]
        )
        .filter((id): id is string => id !== null)
    );

    if (r32TeamIds.size > 0) {
      const bestThirdIds = [...thirdPlaceIds].filter((id) => r32TeamIds.has(id));

      if (bestThirdIds.length === 8) {
        const { data: currentBest } = await supabase
          .from("wc_teams").select("id").eq("is_best_third", true);
        const currentIds = (currentBest ?? []).map((t: { id: string }) => t.id);
        const toRemove = currentIds.filter((id: string) => !bestThirdIds.includes(id as string));
        const toAdd = bestThirdIds.filter((id) => !currentIds.includes(id));

        if (toRemove.length > 0) {
          await supabase.from("wc_teams").update({ is_best_third: false }).in("id", toRemove);
        }
        if (toAdd.length > 0) {
          await supabase.from("wc_teams").update({ is_best_third: true }).in("id", toAdd);
        }
      }
    }
  }

  return NextResponse.json({ teams: teamsData.length, matches: matchesSynced, standings: standingsSynced });
}
