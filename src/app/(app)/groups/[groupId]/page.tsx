import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { calcGroupScore, calcBestThirdScore, calcKnockoutScore } from "@/lib/scoring";
import CopyInviteButton from "./CopyInviteButton";
import ParticipantsList from "./ParticipantsList";
import GroupNameEditor from "./GroupNameEditor";
import LeaveGroupButton from "./LeaveGroupButton";
import styles from "./page.module.css";

interface GroupRow {
  id: string;
  name: string;
  creator_id: string;
  invite_code: string;
  phase1_locked: boolean;
  phase1_deadline: string | null;
  max_participants: number;
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

  const admin = createAdminClient();
  const safeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", safeIds);

  const profileIds = new Set((profiles ?? []).map((p) => p.id));
  const noDisplayName = (profiles ?? []).filter((p) => !p.display_name).map((p) => p.id);
  const noProfile = memberIds.filter((id) => !profileIds.has(id));
  const needEmail = [...noDisplayName, ...noProfile];

  const emailById: Record<string, string> = {};
  if (needEmail.length > 0) {
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of authUsers?.users ?? []) {
      if (needEmail.includes(u.id) && u.email) {
        emailById[u.id] = u.email.split("@")[0];
      }
    }
  }

  const nameById: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameById[p.id] = p.display_name ?? emailById[p.id] ?? "User";
  }
  for (const uid of noProfile) {
    nameById[uid] = emailById[uid] ?? "User";
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

  const currentUserMember = members.find(m => m.userId === user!.id);
  const userHasAllGroupPicks = (currentUserMember?.groupsSubmitted ?? 0) >= 12;

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

  return (
    <>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.topRow}>
          <Link href="/dashboard" className={styles.back}>← My groups</Link>
          {isCreator && (
            <Link href={`/groups/${groupId}/admin`} className={styles.adminLink}>
              ⚙️ Admin
            </Link>
          )}
        </div>
        {isCreator
          ? <GroupNameEditor groupId={groupId} initialName={group.name} />
          : <h1 className={styles.groupName}>{group.name}</h1>
        }
      </div>

      {/* ── How it works ── */}
      <div className={styles.howItWorks}>
        <span className={styles.howItWorksStripe} aria-hidden />
        <span className={styles.howItWorksBadge}>How it works</span>
        <span>
          Rank each WC group 1–3:{' '}
          <strong>+2 pts</strong> for the correct slot,{' '}
          <strong>+1</strong> for the right team in the wrong rank.{' '}
          Best third: <strong>+2</strong> per team.{' '}
          Knockout winners: <strong>1–5 pts</strong> per correct call.
        </span>
      </div>

      {/* ── CTA card ── */}
      <div className={styles.ctaCard}>
        <div className={styles.ctaOrb} />
        <div className={styles.ctaTop}>
          <div>
            <div className={`eyebrow ${styles.ctaEyebrow}`}>Predictions open</div>
            <div className={styles.ctaHeadline}>
              {phase1IsOpen ? "Group stage to call." : "Knockout picks to call."}
            </div>
            <div className={styles.ctaMeta}>
              <ParticipantsList names={members.map((m) => m.name)} />
              {phase1Deadline && phase1IsOpen && (
                <span>Closes {phase1Deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              )}
            </div>
          </div>
          <Link
            href={`/groups/${groupId}/predict`}
            className={`${styles.ctaPredictBtn} ${userHasAllGroupPicks && phase1IsOpen ? styles.ctaPredictBtnDone : ""}`}
          >
            {userHasAllGroupPicks && phase1IsOpen ? "Picks submitted · Edit picks" : "Make Roundpick"}
          </Link>
        </div>
        <div className={styles.ctaDivider} />
        {members.length >= group.max_participants ? (
          <div className={styles.ctaInviteFull}>
            <span>🔒 Group full ({members.length}/{group.max_participants})</span>
            {isCreator && <span className={styles.ctaFullHint}>Increase limit in ⚙️ Admin.</span>}
          </div>
        ) : (
          <div className={styles.ctaInviteRow}>
            <div>
              <div className={styles.ctaInviteLabel}>Invite link · {members.length}/{group.max_participants}</div>
              <div className={styles.ctaInviteUrl}>{inviteUrl}</div>
            </div>
            <CopyInviteButton url={inviteUrl} />
          </div>
        )}
      </div>

      {/* ── Phase strip ── */}
      <div className={styles.phaseStrip}>
        <div className={`${styles.phaseItem} ${!knockoutsStarted ? styles.phaseItemActive : styles.phaseItemDone}`}>
          <span className={styles.phaseDot} />
          <span className={styles.phaseLabel}>Group stage</span>
        </div>
        <div className={styles.phaseLine} />
        <div className={`${styles.phaseItem} ${knockoutsStarted ? styles.phaseItemActive : styles.phaseItemPending}`}>
          <span className={styles.phaseDot} />
          <span className={styles.phaseLabel}>Knockouts</span>
        </div>
      </div>

      {/* ── Leaderboard ── */}
      <div className={styles.leaderboard} style={{ marginBottom: "1.5rem" }}>
        <div className={`eyebrow ${styles.lbEyebrow}`}>Leaderboard · {group.name}</div>
        {members.length === 0 && (
          <p className={styles.noPicksMsg}>No participants yet. Share the invite link!</p>
        )}
        <ul className={styles.lbList}>
          {members.map((m, i) => (
            <li key={m.userId} className={`${styles.lbRow} ${m.userId === user!.id ? styles.me : ""}`}>
              <span className={styles.lbRank}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.lbName}>
                {m.name}{m.userId === user!.id ? " (you)" : ""}
                {hasGroupResults && i === 0 && <span className={styles.hotBadge}>HOT</span>}
              </span>
              <span className={styles.lbScore}>
                {hasGroupResults && m.score !== null ? (
                  <span className={styles.lbPoints}>
                    {m.score}
                    {m.score > 0 && (
                      <span className={styles.lbBreakdown}>
                        {m.groupScore}{m.bestThirdScore !== null ? `+${m.bestThirdScore}` : ""}{m.knockoutScore !== null ? `+${m.knockoutScore}` : ""}
                      </span>
                    )}
                  </span>
                ) : m.groupsSubmitted < 12 ? (
                  <span className={styles.lbPending}>{m.groupsSubmitted}/12</span>
                ) : (
                  <span className={styles.lbDone}>✓</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {!isCreator && (
        <div className={styles.leaveRow}>
          <LeaveGroupButton groupId={groupId} />
        </div>
      )}
    </>
  );
}
