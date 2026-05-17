import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { calcGroupScore, calcBestThirdScore, calcKnockoutScore } from "@/lib/scoring";
import CopyInviteButton from "./CopyInviteButton";
import styles from "./page.module.css";

interface GroupRow {
  id: string;
  name: string;
  creator_id: string;
  invite_code: string;
  phase1_locked: boolean;
  phase1_deadline: string | null;
  group_members: { user_id: string }[];
  events: { name: string; slug: string } | null;
}

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Nested join result — cast to GroupRow since Supabase types don't model FK relations
  const { data: group } = await supabase
    .from("groups")
    .select("*, group_members(user_id), events(name, slug)")
    .eq("id", groupId)
    .single() as unknown as { data: GroupRow | null };

  if (!group) notFound();

  const isCreator = group.creator_id === user!.id;
  const isMember = (group.group_members ?? []).some((m) => m.user_id === user!.id);
  if (!isMember && !isCreator) notFound();

  const memberIds = (group.group_members ?? []).map((m) => m.user_id);

  // Fetch display names via admin client — profiles RLS only exposes own row
  const admin = createAdminClient();
  const safeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", safeIds);

  const nullProfileIds = (profiles ?? [])
    .filter((p) => !p.display_name)
    .map((p) => p.id);

  const emailById: Record<string, string> = {};
  if (nullProfileIds.length > 0) {
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of authUsers?.users ?? []) {
      if (nullProfileIds.includes(u.id) && u.email) {
        emailById[u.id] = u.email.split("@")[0];
      }
    }
  }

  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameById[p.id] = p.display_name ?? emailById[p.id] ?? "User";
  }

  const { data: picks } = await supabase
    .from("group_picks")
    .select("user_id, wc_group, rank1_id, rank2_id, rank3_id")
    .eq("group_id", groupId);

  const { data: groupResultsRaw } = await supabase
    .from("wc_group_results")
    .select("wc_group, rank1_id, rank2_id, rank3_id");
  const groupResults = groupResultsRaw ?? [];
  const hasGroupResults = groupResults.some((r) => r.rank1_id);

  const { data: officialBestThirdRaw } = await supabase
    .from("wc_teams")
    .select("id")
    .eq("is_best_third", true);
  const officialBestThirdIds = (officialBestThirdRaw ?? []).map((t) => t.id);
  const hasBestThird = officialBestThirdIds.length === 8;

  const { data: bestThirdPicksRaw } = await supabase
    .from("best_third_picks")
    .select("user_id, team_ids")
    .eq("group_id", groupId);
  const bestThirdByUserId: Record<string, string[]> = {};
  for (const p of bestThirdPicksRaw ?? []) {
    bestThirdByUserId[p.user_id] = p.team_ids;
  }

  const { data: knockoutMatchesRaw } = await supabase
    .from("wc_matches")
    .select("id, round, home_team_id, away_team_id, home_score, away_score, status")
    .in("round", ["R32", "R16", "QF", "SF", "FINAL", "3RD"]);
  const knockoutMatches = (knockoutMatchesRaw ?? []) as {
    id: string; round: string;
    home_team_id: string | null; away_team_id: string | null;
    home_score: number | null; away_score: number | null; status: string;
  }[];
  const hasKnockoutResults = knockoutMatches.some((m) => m.status === "finished");

  const { data: knockoutPicksRaw } = await supabase
    .from("knockout_picks")
    .select("user_id, match_id, winner_id")
    .eq("group_id", groupId);
  type KoPickRow = { user_id: string; match_id: string; winner_id: string };
  const koPicksByUser: Record<string, KoPickRow[]> = {};
  for (const p of (knockoutPicksRaw ?? []) as KoPickRow[]) {
    if (!koPicksByUser[p.user_id]) koPicksByUser[p.user_id] = [];
    koPicksByUser[p.user_id].push(p);
  }

  type PickRow = { user_id: string; wc_group: string; rank1_id: string; rank2_id: string; rank3_id: string | null };
  const picksByUserId: Record<string, PickRow[]> = {};
  for (const p of picks ?? []) {
    if (!picksByUserId[p.user_id]) picksByUserId[p.user_id] = [];
    picksByUserId[p.user_id]!.push(p);
  }

  const members = memberIds
    .map((uid) => {
      const userPicks = picksByUserId[uid] ?? [];
      const groupScore = hasGroupResults ? calcGroupScore(userPicks, groupResults) : null;
      const bestThirdScore = hasBestThird
        ? calcBestThirdScore(bestThirdByUserId[uid] ?? [], officialBestThirdIds)
        : null;
      const knockoutScore = hasKnockoutResults
        ? calcKnockoutScore(koPicksByUser[uid] ?? [], knockoutMatches)
        : null;
      const totalScore = groupScore !== null
        ? groupScore + (bestThirdScore ?? 0) + (knockoutScore ?? 0)
        : null;
      return {
        userId: uid,
        name: nameById[uid] ?? "Unknown",
        groupsSubmitted: userPicks.length,
        groupScore,
        bestThirdScore,
        knockoutScore,
        score: totalScore,
      };
    })
    .sort((a, b) =>
      a.score !== null && b.score !== null
        ? b.score - a.score
        : b.groupsSubmitted - a.groupsSubmitted
    );

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
  const knockoutsStarted = group.phase1_locked || (!!phase1Deadline && now >= phase1Deadline);

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/join/${group.invite_code}`;
  const rankEmoji = ["🥇", "🥈", "🥉"];

  return (
    <>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <Link href="/dashboard" className={styles.back}>← My groups</Link>
          {isCreator && (
            <Link href={`/groups/${groupId}/admin`} className={styles.adminLink}>
              ⚙️ Admin
            </Link>
          )}
        </div>
        <h1 className={styles.groupName}>{group.name}</h1>
        {group.events && (
          <div className={styles.eventTag}>⚽ {group.events.name}</div>
        )}
        <div className={styles.groupMeta}>
          <span>👥 {members.length} participants</span>
          {phase1Deadline && phase1IsOpen && (
            <span>⏰ Group picks close: {phase1Deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          )}
        </div>
      </div>

      <div className={styles.inviteBox}>
        <div>
          <div className={styles.inviteLabel}>Invite link — share with friends</div>
          <div className={styles.inviteUrl}>{inviteUrl}</div>
        </div>
        <CopyInviteButton url={inviteUrl} />
      </div>

      <div className={styles.phaseBar}>
        <span className={`${styles.phaseBadge} ${phase1IsOpen || knockoutsStarted ? styles.open : styles.locked}`}>
          {phase1IsOpen
            ? "✅ Group stage predictions open"
            : knockoutsStarted
            ? "⚽ Knockout picks — vote per match"
            : "🔒 Predictions not started"}
        </span>
        <Link href={`/groups/${groupId}/predict`} className={styles.predictBtn}>
          {phase1IsOpen ? "Make group picks →" : "View & pick matches →"}
        </Link>
      </div>

      <h2 className={styles.sectionTitle}>Leaderboard</h2>
      <div className={styles.leaderboard}>
        {members.length === 0 && (
          <p className={styles.noPicksMsg}>No participants yet. Share the invite link!</p>
        )}
        {members.map((m, i) => (
          <div key={m.userId} className={`${styles.lbRow} ${m.userId === user!.id ? styles.me : ""}`}>
            <span className={`${styles.lbRank} ${hasGroupResults && i === 0 ? styles.gold : hasGroupResults && i === 1 ? styles.silver : hasGroupResults && i === 2 ? styles.bronze : ""}`}>
              {hasGroupResults && i < 3 ? rankEmoji[i] : i + 1}
            </span>
            <span className={styles.lbName}>
              {m.name} {m.userId === user!.id ? "(you)" : ""}
            </span>
            <span className={styles.lbScore}>
              {hasGroupResults && m.score !== null ? (
                <span className={styles.lbPoints}>
                  {m.score} pts
                  {m.score > 0 && (
                    <span className={styles.lbBreakdown}>
                      {m.groupScore}
                      {m.bestThirdScore !== null ? `+${m.bestThirdScore}` : ""}
                      {m.knockoutScore !== null ? `+${m.knockoutScore}` : ""}
                    </span>
                  )}
                </span>
              ) : m.groupsSubmitted < 12 ? (
                <span className={styles.lbPending}>{m.groupsSubmitted}/12 picked</span>
              ) : (
                <span className={styles.lbDone}>Picks in ✓</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
