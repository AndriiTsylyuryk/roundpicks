import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PredictForm from "./PredictForm";
import KnockoutForm from "./KnockoutForm";
import FinalsForm from "./FinalsForm";
import styles from "./page.module.css";

interface GroupBasic {
  id: string;
  name: string;
  phase1_locked: boolean;
  phase2_locked: boolean;
  phase3_locked: boolean;
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
    .select("id, name, phase1_locked, phase2_locked, phase3_locked, group_members(user_id)")
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

  const { data: existingPicks } = await supabase
    .from("group_picks")
    .select("wc_group, rank1_id, rank2_id, rank3_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  // Phase 2 data — only fetch when phase1 is locked
  let matches: WcMatch[] = [];
  let knockoutPicks: { match_id: string; winner_id: string }[] = [];

  if (group.phase1_locked) {
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

  // Phase 3 data — only fetch when phase2 is locked
  let finalsPick: { winner_id: string | null; runner_up_id: string | null; third_id: string | null } | null = null;

  if (group.phase2_locked) {
    const { data: fp } = await supabase
      .from("finals_picks")
      .select("winner_id, runner_up_id, third_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();
    finalsPick = fp ?? null;
  }

  return (
    <>
      <div className={styles.header}>
        <Link href={`/groups/${groupId}`} className={styles.back}>← Back to group</Link>
        <h1 className={styles.title}>Predictions</h1>
        <p className={styles.subtitle}>
          Rank <strong>1st, 2nd &amp; 3rd</strong> in each of the 12 groups. Pick 8 best third-place qualifiers. Then predict match winners.
        </p>
      </div>

      {/* Phase 1: Group stage + best third */}
      <PredictForm
        groupId={groupId}
        userId={user.id}
        teams={teams}
        existingPicks={existingPicks ?? []}
        isLocked={group.phase1_locked}
      />

      {/* Phase 2: Knockout match winners */}
      {group.phase1_locked && (
        <div className={styles.phaseSection}>
          <h2 className={styles.phaseSectionTitle}>Phase 2: Knockout Picks</h2>
          <p className={styles.phaseSectionSub}>
            Pick the winner of each knockout match.
            {group.phase2_locked ? " Predictions are closed." : " Predictions are open."}
          </p>
          <KnockoutForm
            groupId={groupId}
            userId={user.id}
            matches={matches}
            teams={teams}
            existingPicks={knockoutPicks}
            isLocked={group.phase2_locked}
          />
        </div>
      )}

      {/* Phase 3: Tournament champion prediction */}
      {group.phase2_locked && (
        <div className={styles.phaseSection}>
          <h2 className={styles.phaseSectionTitle}>Phase 3: Finals Picks</h2>
          <p className={styles.phaseSectionSub}>
            Predict the overall tournament champion, runner-up, and 3rd place.
            {group.phase3_locked ? " Predictions are closed." : " Predictions are open."}
          </p>
          <FinalsForm
            groupId={groupId}
            userId={user.id}
            teams={teams}
            existingPick={finalsPick}
            isLocked={group.phase3_locked}
          />
        </div>
      )}
    </>
  );
}
