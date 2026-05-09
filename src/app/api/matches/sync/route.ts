import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncWC2026All } from "@/lib/matches-api";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Cooldown: reject if synced within the last 5 minutes
  const { data: recentMatch } = await supabase
    .from("wc_matches")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentMatch?.updated_at) {
    const lastSync = new Date(recentMatch.updated_at).getTime();
    const elapsed = Date.now() - lastSync;
    if (elapsed < 5 * 60 * 1000) {
      const remaining = Math.ceil((5 * 60 * 1000 - elapsed) / 1000);
      return NextResponse.json(
        { error: `Sync cooldown — try again in ${remaining}s` },
        { status: 429 }
      );
    }
  }

  const { teamsData, matchesData, error } = await syncWC2026All();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!teamsData || teamsData.length === 0) {
    return NextResponse.json(
      { error: "No team data returned — WC 2026 standings may not be published yet on football-data.org" },
      { status: 502 }
    );
  }

  const { error: teamsError } = await supabase
    .from("wc_teams")
    .upsert(teamsData, { onConflict: "name" });

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  let matchesSynced = 0;

  if (matchesData && matchesData.length > 0) {
    const { data: teamsInDb } = await supabase
      .from("wc_teams")
      .select("id, external_id");

    const teamByExtId: Record<number, string> = {};
    for (const t of teamsInDb ?? []) {
      if (t.external_id) teamByExtId[t.external_id] = t.id;
    }

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
      return NextResponse.json({
        teams: teamsData.length,
        matches: 0,
        matchesWarning: matchesError.message,
      });
    }

    matchesSynced = matchRows.length;
  }

  return NextResponse.json({ teams: teamsData.length, matches: matchesSynced });
}
