import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calcGroupScore, calcBestThirdScore, calcKnockoutScore } from "@/lib/scoring";
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

  // Official group results (for scoring)
  const { data: groupResultsRaw } = await supabase
    .from("wc_group_results")
    .select("wc_group, rank1_id, rank2_id, rank3_id");
  const groupResults = (groupResultsRaw ?? []) as {
    wc_group: string; rank1_id: string | null; rank2_id: string | null; rank3_id: string | null;
  }[];
  const hasGroupResults = groupResults.some((r) => r.rank1_id);

  // Official best 3rd (for scoring)
  const { data: officialBestThirdRaw } = await supabase
    .from("wc_teams").select("id").eq("is_best_third", true);
  const officialBestThirdIds = (officialBestThirdRaw ?? []).map((t) => t.id);

  // User's saved best 3rd picks
  const { data: bestThirdPick } = await supabase
    .from("best_third_picks")
    .select("team_ids")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  const existingBestThirdIds: string[] = bestThirdPick?.team_ids ?? [];

  // Phase 1 deadline from first GROUP match kickoff
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

    const { data: koPicksRaw } = await supabase
      .from("knockout_picks")
      .select("match_id, winner_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    knockoutPicks = (koPicksRaw ?? []) as { match_id: string; winner_id: string }[];
  }

  // Compute score totals (only when official results exist)
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
      <div className={styles.header}>
        <Link href={`/groups/${groupId}`} className={styles.back}>← Back to group</Link>
        <h1 className={styles.title}>Predictions</h1>
        <p className={styles.subtitle}>
          {phase1IsOpen
            ? <>Rank <strong>1st, 2nd &amp; 3rd</strong> in each of the 12 groups and pick 8 best third-place qualifiers.{deadlineStr && <> Closes <strong>{deadlineStr}</strong>.</>}</>
            : showKnockouts
            ? "Group stage closed. Pick match winners — each match locks at kickoff."
            : "Predictions open soon."}
        </p>
      </div>

      {/* Score summary — shown once any results are in */}
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
      <PredictForm
        groupId={groupId}
        userId={user.id}
        teams={teams}
        existingPicks={existingPicks}
        isLocked={!phase1IsOpen}
        groupResults={groupResults}
        existingBestThirdIds={existingBestThirdIds}
        officialBestThirdIds={officialBestThirdIds}
      />

      {/* Phase 2+: Knockout match winners */}
      {showKnockouts && (
        <div className={styles.phaseSection}>
          <h2 className={styles.phaseSectionTitle}>Knockout Picks</h2>
          <p className={styles.phaseSectionSub}>
            Pick the winner of each match. Voting closes at kickoff for each individual match.
          </p>
          <KnockoutForm
            groupId={groupId}
            userId={user.id}
            matches={matches}
            teams={teams}
            existingPicks={knockoutPicks}
          />
        </div>
      )}
    </>
  );
}
