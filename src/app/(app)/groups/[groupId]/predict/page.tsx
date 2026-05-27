import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calcGroupScore, calcBestThirdScore, calcKnockoutScore, deriveGroupStandings } from "@/lib/scoring";
import PredictForm from "./PredictForm";
import KnockoutForm from "./KnockoutForm";
import styles from "./page.module.css";

interface GroupBasic {
  id: string;
  name: string;
  phase1_locked: boolean;
  group_members: { user_id: string }[];
}

interface WcMatch {
  id: string;
  round: string;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function PredictPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, phase1_locked, group_members(user_id)")
    .eq("id", groupId)
    .single() as unknown as { data: GroupBasic | null };

  if (!group) notFound();

  const isMember = group.group_members.some((m) => m.user_id === user.id);
  if (!isMember) notFound();

  const { data: teamsRaw } = await supabase
    .from("wc_teams")
    .select("id, name, group_letter")
    .order("group_letter")
    .order("name");
  const teams = (teamsRaw ?? []) as { id: string; name: string; group_letter: string }[];

  const { data: existingPicksRaw } = await supabase
    .from("group_picks")
    .select("wc_group, rank1_id, rank2_id, rank3_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  const existingPicks = (existingPicksRaw ?? []) as {
    wc_group: string; rank1_id: string; rank2_id: string; rank3_id: string | null;
  }[];

  const { data: finishedGroupMatchesRaw } = await supabase
    .from("wc_matches")
    .select("home_team_id, away_team_id, home_score, away_score, status")
    .eq("round", "GROUP")
    .eq("status", "finished");
  const groupResults = deriveGroupStandings(finishedGroupMatchesRaw ?? [], teams);
  const hasGroupResults = groupResults.some((r) => r.rank1_id);

  let officialBestThirdIds: string[] = [];

  const { data: bestThirdPick } = await supabase
    .from("best_third_picks")
    .select("team_ids")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  const existingBestThirdIds: string[] = bestThirdPick?.team_ids ?? [];

  const { data: firstGroupMatch } = await supabase
    .from("wc_matches")
    .select("kickoff_at")
    .eq("round", "GROUP")
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const phase1Deadline = firstGroupMatch?.kickoff_at ? new Date(firstGroupMatch.kickoff_at) : null;
  const phase1IsOpen = !group.phase1_locked && (!phase1Deadline || now < phase1Deadline);
  const showKnockouts = group.phase1_locked || (!!phase1Deadline && now >= phase1Deadline);

  let matches: WcMatch[] = [];
  let knockoutPicks: { match_id: string; winner_id: string }[] = [];

  if (showKnockouts) {
    const { data: matchesRaw } = await supabase
      .from("wc_matches")
      .select("id, round, kickoff_at, home_team_id, away_team_id, status, home_score, away_score")
      .in("round", ["R32", "R16", "QF", "SF", "FINAL", "3RD"])
      .order("kickoff_at");
    matches = (matchesRaw ?? []) as WcMatch[];

    const thirdPlaceIds = new Set(
      groupResults.map((r) => r.rank3_id).filter((id): id is string => id !== null),
    );
    const r32TeamIds = new Set(
      matches
        .filter((m) => m.round === "R32")
        .flatMap((m) => [m.home_team_id, m.away_team_id])
        .filter((id): id is string => id !== null),
    );
    if (r32TeamIds.size > 0) {
      officialBestThirdIds = [...thirdPlaceIds].filter((id) => r32TeamIds.has(id));
    }

    const { data: koPicksRaw } = await supabase
      .from("knockout_picks")
      .select("match_id, winner_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    knockoutPicks = (koPicksRaw ?? []) as { match_id: string; winner_id: string }[];
  }

  const firstR32Match = matches.find((m) => m.round === "R32");
  const isKnockoutLocked = group.phase2_locked || (!!firstR32Match && now >= new Date(firstR32Match.kickoff_at));

  const groupScore = hasGroupResults ? calcGroupScore(existingPicks, groupResults) : null;
  const bestThirdScore = officialBestThirdIds.length === 8
    ? calcBestThirdScore(existingBestThirdIds, officialBestThirdIds)
    : null;
  const hasKnockoutResults = matches.some((m) => m.status === "finished");
  const knockoutScore = hasKnockoutResults ? calcKnockoutScore(knockoutPicks, matches) : null;
  const totalScore = groupScore !== null
    ? groupScore + (bestThirdScore ?? 0) + (knockoutScore ?? 0)
    : null;

  const deadlineStr = phase1Deadline
    ? phase1Deadline.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })
    : null;

  return (
    <>
      {/* ── Dark banner ── */}
      <div className={styles.heroBanner}>
        <div className={styles.heroOrb} />
        <div className={styles.heroInner}>
          <Link href={`/groups/${groupId}`} className={styles.heroBack}>← {group.name}</Link>
          <div className={styles.heroLabels}>
            <div className={`eyebrow ${styles.heroEyebrow}`}>
              {phase1IsOpen ? "Phase 1 · Group Rankings" : "Phase 2 · Knockout Picks"}
            </div>
            {deadlineStr && phase1IsOpen && (
              <span className={styles.heroDeadline}>Closes {deadlineStr}</span>
            )}
          </div>
        </div>
      </div>

      {/* Score summary */}
      {totalScore !== null && (
        <div className={styles.scoreSummary}>
          <div className={styles.scoreTotalLabel}>Your score</div>
          <div className={styles.scoreTotalValue}>{totalScore} pts</div>
          <div className={styles.scoreBreakdown}>
            {groupScore !== null && (
              <span className={styles.scoreBreakdownItem}>
                <span className={styles.scoreBreakdownKey}>Groups</span>
                <span className={styles.scoreBreakdownVal}>{groupScore}</span>
              </span>
            )}
            {bestThirdScore !== null && (
              <span className={styles.scoreBreakdownItem}>
                <span className={styles.scoreBreakdownKey}>Best 3rd</span>
                <span className={styles.scoreBreakdownVal}>{bestThirdScore}</span>
              </span>
            )}
            {knockoutScore !== null && (
              <span className={styles.scoreBreakdownItem}>
                <span className={styles.scoreBreakdownKey}>Knockouts</span>
                <span className={styles.scoreBreakdownVal}>{knockoutScore}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Phase 1: Group stage + best third */}
      {phase1IsOpen && (
        <PredictForm
          groupId={groupId}
          userId={user.id}
          teams={teams}
          existingPicks={existingPicks}
          isLocked={false}
          groupResults={groupResults}
          existingBestThirdIds={existingBestThirdIds}
          officialBestThirdIds={officialBestThirdIds}
        />
      )}

      {/* Phase 2: Knockout match winners */}
      {showKnockouts && (
        <KnockoutForm
          groupId={groupId}
          userId={user.id}
          matches={matches}
          teams={teams}
          existingPicks={knockoutPicks}
          isKnockoutLocked={isKnockoutLocked}
        />
      )}
    </>
  );
}
