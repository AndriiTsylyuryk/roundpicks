import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calcGroupScore, calcBestThirdScore, calcKnockoutScore, calcMatchPredictionScore, deriveGroupStandings } from "@/lib/scoring";
import PredictForm from "./PredictForm";
import KnockoutForm from "./KnockoutForm";
import AdvancedGroupForm from "./AdvancedGroupForm";
import BestThirdForm from "./BestThirdForm";
import styles from "./page.module.css";

interface GroupBasic {
  id: string;
  name: string;
  phase1_locked: boolean;
  phase2_locked: boolean;
  mode: string;
  group_members: { user_id: string }[];
}

interface AdvancedMatch {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
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
  searchParams: Promise<{ step?: string }>;
}

export default async function PredictPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const stepParam = (await searchParams).step;
  const currentStep = stepParam ? parseInt(stepParam, 10) : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, phase1_locked, phase2_locked, mode, group_members(user_id)")
    .eq("id", groupId)
    .single() as unknown as { data: GroupBasic | null };

  if (!group) notFound();

  const totalSteps = group.mode === "advanced" ? 3 : 2;

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
  const existingBestThirdIdsRaw: string[] = bestThirdPick?.team_ids ?? [];

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

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("has_rated")
    .eq("id", user.id)
    .maybeSingle();
  const userHasRated = profileRaw?.has_rated ?? false;

  // Advanced mode: load all group matches + user's W/D/L predictions
  let advancedMatches: AdvancedMatch[] = [];
  let matchPredictions: { match_id: string; prediction: "home" | "draw" | "away" }[] = [];

  if (group.mode === "advanced") {
    const { data: advRaw } = await supabase
      .from("wc_matches")
      .select("id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score")
      .eq("round", "GROUP")
      .order("kickoff_at");
    advancedMatches = (advRaw ?? []) as AdvancedMatch[];

    const { data: predsRaw } = await supabase
      .from("match_predictions")
      .select("match_id, prediction")
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    matchPredictions = (predsRaw ?? []) as { match_id: string; prediction: "home" | "draw" | "away" }[];
  }

  // Compute third-place candidates: teams not picked as rank 1 or 2
  const pickedRankIds = new Set(existingPicks.flatMap((p) => [p.rank1_id, p.rank2_id]));
  const thirdPlaceTeams = teams.filter((t) => !pickedRankIds.has(t.id));
  const existingBestThirdIds = existingBestThirdIdsRaw.filter((id) => !pickedRankIds.has(id));

  const groupScore = hasGroupResults ? calcGroupScore(existingPicks, groupResults) : null;
  const bestThirdScore = officialBestThirdIds.length === 8
    ? calcBestThirdScore(existingBestThirdIds, officialBestThirdIds)
    : null;
  const hasKnockoutResults = matches.some((m) => m.status === "finished");
  const knockoutScore = hasKnockoutResults ? calcKnockoutScore(knockoutPicks, matches) : null;
  const hasAdvancedResults = advancedMatches.some((m) => m.status === "finished");
  const matchPredictionScore = group.mode === "advanced" && hasAdvancedResults
    ? calcMatchPredictionScore(matchPredictions, advancedMatches)
    : null;
  const totalScore = groupScore !== null
    ? groupScore + (bestThirdScore ?? 0) + (knockoutScore ?? 0) + (matchPredictionScore ?? 0)
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
              {phase1IsOpen ? `Step ${currentStep} of ${totalSteps}` : "Phase 2 · Knockout Picks"}
            </div>
            {deadlineStr && phase1IsOpen && (
              <span className={styles.heroDeadline}>Closes {deadlineStr}</span>
            )}
          </div>
        </div>
      </div>

      {/* Score summary */}
      {/* <div className={styles.scoreSummary}>
        <p className={styles.scoreDesc}>
          Tap a team in each match to pick the winner — each pick auto-fills the
          next round. Opens once the last group-stage match finishes (the full
          bracket is set) and closes at kickoff of the first Round of 32 match.
        </p>
      </div> */}

      {/* Phase 1 step 1 (advanced only): W/D/L for each group match */}
      {phase1IsOpen && group.mode === "advanced" && currentStep === 1 && (
        <AdvancedGroupForm
          groupId={groupId}
          userId={user.id}
          matches={advancedMatches}
          teams={teams}
          existingPicks={matchPredictions}
          isLocked={false}
          nextStepUrl={`/groups/${groupId}/predict?step=2`}
        />
      )}

      {/* Phase 1 step 2 (advanced) / step 1 (simple): Group Rankings */}
      {phase1IsOpen && (
        (group.mode === "advanced" && currentStep === 2) ||
        (group.mode !== "advanced" && currentStep === 1)
      ) && (
        <PredictForm
          groupId={groupId}
          userId={user.id}
          teams={teams}
          existingPicks={existingPicks}
          isLocked={false}
          groupResults={groupResults}
          nextStepUrl={group.mode === "advanced"
            ? `/groups/${groupId}/predict?step=3`
            : `/groups/${groupId}/predict?step=2`
          }
        />
      )}

      {/* Phase 1 step 3 (advanced) / step 2 (simple): Best 3rd-Place Teams */}
      {phase1IsOpen && (
        (group.mode === "advanced" && currentStep === 3) ||
        (group.mode !== "advanced" && currentStep === 2)
      ) && (
        <BestThirdForm
          groupId={groupId}
          userId={user.id}
          thirdPlaceTeams={thirdPlaceTeams}
          isLocked={false}
          existingSelectedIds={existingBestThirdIds}
          officialBestThirdIds={officialBestThirdIds}
          nextStepUrl={`/groups/${groupId}`}
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
          userHasRated={userHasRated}
        />
      )}
    </>
  );
}
