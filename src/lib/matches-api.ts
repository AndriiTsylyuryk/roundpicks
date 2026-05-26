const BASE_URL = "https://api.football-data.org/v4";

const ROUND_MAP: Record<string, string> = {
  GROUP_STAGE: "GROUP",
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "3RD",
  FINAL: "FINAL",
};

interface FDMatch {
  id: number;
  stage: string;
  group?: string | null;
  homeTeam: { id: number } | null;
  awayTeam: { id: number } | null;
  utcDate: string;
  status: string;
  score: { fullTime: { home: number | null; away: number | null } };
}

interface FDTeam {
  id: number;
  tla: string;
  name: string;
  shortName: string;
}

interface FDStandingEntry {
  position: number;
  team: { id: number };
}

interface FDStandingGroup {
  stage: string;
  type: string;
  group: string;
  table: FDStandingEntry[];
}

export interface StandingRow {
  wc_group: string;
  rank1_ext_id: number;
  rank2_ext_id: number;
  rank3_ext_id: number;
}

export async function syncWC2026All(): Promise<{
  teamsData?: Array<{
    name: string;
    group_letter: string;
    external_id: number;
  }>;
  matchesData?: Array<{
    external_id: number;
    round: string;
    home_external_id: number | null;
    away_external_id: number | null;
    home_score: number | null;
    away_score: number | null;
    status: string;
    kickoff_at: string;
  }>;
  standingsData?: StandingRow[];
  error?: string;
}> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return { error: "FOOTBALL_DATA_API_KEY not set" };

  // 1st call — teams
  const teamsRes = await fetch(
    `${BASE_URL}/competitions/WC/teams?season=2026`,
    {
      headers: { "X-Auth-Token": key },
      cache: "no-store",
    },
  );

  if (!teamsRes.ok) {
    const body = await teamsRes.json().catch(() => ({}));
    return {
      error: `Teams API ${teamsRes.status}: ${body.message ?? "unknown error"}`,
    };
  }

  const teamsJson = await teamsRes.json();
  const rawTeams: FDTeam[] = teamsJson?.teams ?? [];

  if (rawTeams.length === 0) {
    return { error: "No teams returned from football-data.org" };
  }

  // 2nd call — matches (group assignments + all fixtures with scores)
  const matchesRes = await fetch(
    `${BASE_URL}/competitions/WC/matches?season=2026`,
    {
      headers: { "X-Auth-Token": key },
      cache: "no-store",
    },
  );

  if (!matchesRes.ok) {
    const body = await matchesRes.json().catch(() => ({}));
    return {
      error: `Matches API ${matchesRes.status}: ${body.message ?? "unknown error"}`,
    };
  }

  const matchesJson = await matchesRes.json().catch(() => ({ matches: [] }));
  const allMatches: FDMatch[] = matchesJson?.matches ?? [];

  const groupMap: Record<number, string> = {};
  for (const m of allMatches) {
    if (!m.group) continue;
    const letter = String(m.group)
      .replace(/^GROUP_/i, "")
      .trim();
    if (letter.length === 1 && /^[A-L]$/i.test(letter)) {
      const g = letter.toUpperCase();
      if (m.homeTeam?.id) groupMap[m.homeTeam.id] = g;
      if (m.awayTeam?.id) groupMap[m.awayTeam.id] = g;
    }
  }

  const teamsData = rawTeams.map((t) => ({
    name: t.shortName || t.name,
    group_letter: groupMap[t.id] ?? "?",
    external_id: t.id,
  }));

  const matchesData = allMatches
    .filter((m) => ROUND_MAP[m.stage])
    .map((m) => ({
      external_id: m.id,
      round: ROUND_MAP[m.stage],
      home_external_id: m.homeTeam?.id ?? null,
      away_external_id: m.awayTeam?.id ?? null,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      status:
        m.status === "FINISHED"
          ? "finished"
          : m.status === "IN_PLAY" ||
              m.status === "PAUSED" ||
              m.status === "LIVE"
            ? "live"
            : "scheduled",
      kickoff_at: m.utcDate,
    }));

  // 3rd call — standings (group stage final table, available once groups finish)
  const standingsData: StandingRow[] = [];
  const standingsRes = await fetch(
    `${BASE_URL}/competitions/WC/standings?season=2026`,
    {
      headers: { "X-Auth-Token": key },
      cache: "no-store",
    },
  );

  if (standingsRes.ok) {
    const standingsJson = await standingsRes
      .json()
      .catch(() => ({ standings: [] }));
    const groups: FDStandingGroup[] = standingsJson?.standings ?? [];

    for (const group of groups) {
      if (group.type !== "TOTAL") continue;
      const letter = String(group.group ?? "")
        .replace(/^GROUP_/i, "")
        .trim();
      if (!/^[A-L]$/.test(letter)) continue;
      const sorted = [...group.table].sort((a, b) => a.position - b.position);
      if (sorted.length < 3) continue;
      standingsData.push({
        wc_group: letter,
        rank1_ext_id: sorted[0].team.id,
        rank2_ext_id: sorted[1].team.id,
        rank3_ext_id: sorted[2].team.id,
      });
    }
  }
  // standings returning non-ok is not a fatal error (group stage may not have started yet)

  return { teamsData, matchesData, standingsData };
}
