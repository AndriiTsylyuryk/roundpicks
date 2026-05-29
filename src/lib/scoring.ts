interface GroupPick {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

export interface GroupResult {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

interface GroupMatch {
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

export function deriveGroupStandings(
  matches: GroupMatch[],
  teams: { id: string; group_letter: string }[],
): GroupResult[] {
  type Stats = { pts: number; gd: number; gf: number };
  const stats = new Map<string, Stats>(
    teams.map((t) => [t.id, { pts: 0, gd: 0, gf: 0 }]),
  );

  const teamsWithResults = new Set<string>();

  for (const m of matches) {
    if (m.status !== "finished") continue;
    if (!m.home_team_id || !m.away_team_id) continue;
    if (m.home_score === null || m.away_score === null) continue;
    const h = stats.get(m.home_team_id);
    const a = stats.get(m.away_team_id);
    if (!h || !a) continue;
    teamsWithResults.add(m.home_team_id);
    teamsWithResults.add(m.away_team_id);
    h.gf += m.home_score;
    h.gd += m.home_score - m.away_score;
    a.gf += m.away_score;
    a.gd += m.away_score - m.home_score;
    if (m.home_score > m.away_score) h.pts += 3;
    else if (m.home_score < m.away_score) a.pts += 3;
    else { h.pts += 1; a.pts += 1; }
  }

  const byGroup = new Map<string, string[]>();
  for (const t of teams) {
    if (!/^[A-L]$/.test(t.group_letter)) continue;
    if (!byGroup.has(t.group_letter)) byGroup.set(t.group_letter, []);
    byGroup.get(t.group_letter)!.push(t.id);
  }

  const results: GroupResult[] = [];
  for (const [letter, ids] of byGroup) {
    const hasResults = ids.some((id) => teamsWithResults.has(id));
    if (!hasResults) {
      results.push({ wc_group: letter, rank1_id: null, rank2_id: null, rank3_id: null });
      continue;
    }
    const sorted = [...ids].sort((a, b) => {
      const sa = stats.get(a)!;
      const sb = stats.get(b)!;
      if (sb.pts !== sa.pts) return sb.pts - sa.pts;
      if (sb.gd !== sa.gd) return sb.gd - sa.gd;
      return sb.gf - sa.gf;
    });
    results.push({
      wc_group: letter,
      rank1_id: sorted[0] ?? null,
      rank2_id: sorted[1] ?? null,
      rank3_id: sorted[2] ?? null,
    });
  }

  return results;
}

// +2 per correct team in official best 8 third-placers
export function calcBestThirdScore(userPicks: string[], officialIds: string[]): number {
  const officialSet = new Set(officialIds);
  return userPicks.filter((id) => officialSet.has(id)).length * 2;
}

export const ROUND_POINTS: Record<string, number> = {
  R32: 1, R16: 2, QF: 3, SF: 4, FINAL: 5, "3RD": 3,
};

interface KnockoutPick {
  match_id: string;
  winner_id: string;
}

interface WcMatchResult {
  id: string;
  round: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

// Points per correct match winner, weighted by round
export function calcKnockoutScore(picks: KnockoutPick[], matches: WcMatchResult[]): number {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  let score = 0;
  for (const pick of picks) {
    const match = matchById.get(pick.match_id);
    if (!match || match.status !== "finished") continue;
    if (match.home_score === null || match.away_score === null) continue;
    const actualWinner =
      match.home_score > match.away_score
        ? match.home_team_id
        : match.away_score > match.home_score
        ? match.away_team_id
        : null;
    if (actualWinner && pick.winner_id === actualWinner) {
      score += ROUND_POINTS[match.round] ?? 0;
    }
  }
  return score;
}

// +1 per correct W/D/L prediction for group matches
export function calcMatchPredictionScore(
  predictions: { match_id: string; prediction: "home" | "draw" | "away" }[],
  matches: { id: string; home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null; status: string }[],
): number {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  let score = 0;
  for (const p of predictions) {
    const m = matchById.get(p.match_id);
    if (!m || m.status !== "finished" || m.home_score === null || m.away_score === null) continue;
    const actual: "home" | "draw" | "away" =
      m.home_score > m.away_score ? "home"
      : m.away_score > m.home_score ? "away"
      : "draw";
    if (p.prediction === actual) score += 1;
  }
  return score;
}

// +2 correct team + correct rank, +1 correct team wrong rank
export function calcGroupScore(picks: GroupPick[], results: GroupResult[]): number {
  const resultByGroup = new Map(results.map((r) => [r.wc_group, r]));
  let score = 0;
  for (const pick of picks) {
    const result = resultByGroup.get(pick.wc_group);
    if (!result) continue;
    const official = [result.rank1_id, result.rank2_id, result.rank3_id];
    const predicted = [pick.rank1_id, pick.rank2_id, pick.rank3_id];
    for (let i = 0; i < 3; i++) {
      const team = predicted[i];
      if (!team) continue;
      if (official[i] === team) score += 2;
      else if (official.includes(team)) score += 1;
    }
  }
  return score;
}
