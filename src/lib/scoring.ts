interface GroupPick {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

interface GroupResult {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
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
