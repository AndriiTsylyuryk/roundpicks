import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import {
  calcGroupScore,
  calcBestThirdScore,
  calcKnockoutScore,
  deriveGroupStandings,
} from "@/lib/scoring";
import styles from "./page.module.css";

interface GroupRow {
  id: string;
  name: string;
  creator_id: string;
  phase1_locked: boolean;
  events: { name: string } | null;
}

interface StandingRow {
  userId: string;
  name: string;
  you: boolean;
  points: number | null;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();
  const displayName =
    profile?.display_name ?? user?.user_metadata.full_name ?? "player";

  const { data: membershipsRaw } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user!.id);
  const groupIds = (membershipsRaw ?? []).map(
    (m: { group_id: string }) => m.group_id,
  );

  const { data: event } = await supabase
    .from("events")
    .select("name, starts_at, ends_at")
    .eq("slug", "wc2026")
    .single<{ name: string; starts_at: string; ends_at: string } | null>();

  const tournamentName = event?.name ?? "FIFA World Cup 2026";
  const tournamentStart = event?.starts_at ? new Date(event.starts_at) : null;
  const tournamentEnd = event?.ends_at ? new Date(event.ends_at) : null;
  const tournamentRange =
    tournamentStart && tournamentEnd
      ? `${fmtDate(tournamentStart)} – ${fmtDate(tournamentEnd)} · USA, Canada & Mexico`
      : "USA, Canada & Mexico";

  if (groupIds.length === 0) {
    return (
      <>
        <div className={styles.banner}>
          <div className={styles.bannerOrb} />
          <div className={styles.bannerLeft}>
            <div className={`eyebrow ${styles.bannerEyebrow}`}>
              Active tournament
            </div>
            <div className={styles.bannerTitle}>{tournamentName}</div>
            <div className={styles.bannerSub}>{tournamentRange}</div>
          </div>
        </div>
        <div className={styles.header}>
          <div>
            <div className={`eyebrow ${styles.headerEyebrow}`}>Your groups</div>
            <h1 className={styles.title}>Welcome back, {displayName}.</h1>
          </div>
        </div>
        <div className={styles.grid}>
          <div className={styles.empty}>
            <h2>No groups yet</h2>
            <p>Create a group and invite your friends to start predicting!</p>
            <Link href="/groups/new" className={styles.createBtn}>
              + Create your first group
            </Link>
          </div>
        </div>
      </>
    );
  }

  const safeIds = groupIds as string[];

  const [
    groupsResult,
    allMembersResult,
    resultsCountResult,
    firstMatchResult,
    groupPicksResult,
    finishedGroupMatchesResult,
    wcTeamsResult,
    knockoutMatchesResult,
    knockoutPicksResult,
    bestThirdPicksResult,
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, creator_id, phase1_locked, events(name)")
      .in("id", safeIds) as unknown as Promise<{ data: GroupRow[] | null }>,
    supabase
      .from("group_members")
      .select("group_id, user_id")
      .in("group_id", safeIds),
    supabase
      .from("wc_matches")
      .select("id", { count: "exact", head: true })
      .eq("round", "GROUP")
      .eq("status", "finished"),
    supabase
      .from("wc_matches")
      .select("kickoff_at")
      .eq("round", "GROUP")
      .order("kickoff_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("group_picks")
      .select("group_id, user_id, wc_group, rank1_id, rank2_id, rank3_id")
      .in("group_id", safeIds),
    supabase
      .from("wc_matches")
      .select("home_team_id, away_team_id, home_score, away_score, status")
      .eq("round", "GROUP")
      .eq("status", "finished"),
    supabase.from("wc_teams").select("id, group_letter"),
    supabase
      .from("wc_matches")
      .select(
        "id, round, home_team_id, away_team_id, home_score, away_score, status",
      )
      .in("round", ["R32", "R16", "QF", "SF", "FINAL", "3RD"]),
    supabase
      .from("knockout_picks")
      .select("group_id, user_id, match_id, winner_id")
      .in("group_id", safeIds),
    supabase
      .from("best_third_picks")
      .select("group_id, user_id, team_ids")
      .in("group_id", safeIds),
  ]);

  const groups = groupsResult.data ?? [];
  const allMembersRaw = (allMembersResult.data ?? []) as {
    group_id: string;
    user_id: string;
  }[];
  const hasResults = (resultsCountResult.count ?? 0) > 0;

  type GPickRow = {
    group_id: string;
    user_id: string;
    wc_group: string;
    rank1_id: string;
    rank2_id: string;
    rank3_id: string | null;
  };
  type KoPickRow = {
    group_id: string;
    user_id: string;
    match_id: string;
    winner_id: string;
  };
  type BtPickRow = { group_id: string; user_id: string; team_ids: string[] };
  type KoMatchRow = {
    id: string;
    round: string;
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    status: string;
  };

  const allGroupPicks = (groupPicksResult.data ?? []) as GPickRow[];
  const wcTeams = (wcTeamsResult.data ?? []) as {
    id: string;
    group_letter: string;
  }[];
  const knockoutMatches = (knockoutMatchesResult.data ?? []) as KoMatchRow[];
  const allKoPicks = (knockoutPicksResult.data ?? []) as KoPickRow[];
  const allBtPicks = (bestThirdPicksResult.data ?? []) as BtPickRow[];

  const groupResults = deriveGroupStandings(
    finishedGroupMatchesResult.data ?? [],
    wcTeams,
  );
  const hasKnockoutResults = knockoutMatches.some(
    (m) => m.status === "finished",
  );

  const thirdPlaceIds = new Set(
    groupResults
      .map((r) => r.rank3_id)
      .filter((id): id is string => id !== null),
  );
  const r32TeamIds = new Set(
    knockoutMatches
      .filter((m) => m.round === "R32")
      .flatMap((m) => [m.home_team_id, m.away_team_id])
      .filter((id): id is string => id !== null),
  );
  const officialBestThirdIds =
    r32TeamIds.size > 0
      ? [...thirdPlaceIds].filter((id) => r32TeamIds.has(id))
      : [];
  const hasBestThird = officialBestThirdIds.length === 8;

  // Member IDs per group
  const membersByGroup: Record<string, string[]> = {};
  for (const m of allMembersRaw) {
    if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
    membersByGroup[m.group_id].push(m.user_id);
  }

  // Batch load names via admin
  const allMemberIds = [...new Set(Object.values(membersByGroup).flat())];
  const nameById: Record<string, string> = {};

  if (allMemberIds.length > 0) {
    const admin = createAdminClient();
    const { data: profilesRaw } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", allMemberIds);

    const typedProfiles = (profilesRaw ?? []) as {
      id: string;
      display_name: string | null;
    }[];
    const profileIdSet = new Set(typedProfiles.map((p) => p.id));
    const noDisplayNameIds = typedProfiles
      .filter((p) => !p.display_name)
      .map((p) => p.id);
    const noProfileIds = allMemberIds.filter((id) => !profileIdSet.has(id));
    const needEmail = [...noDisplayNameIds, ...noProfileIds];

    const emailById: Record<string, string> = {};
    if (needEmail.length > 0) {
      const { data: authUsers } = await admin.auth.admin.listUsers({
        perPage: 1000,
      });
      for (const u of authUsers?.users ?? []) {
        if (needEmail.includes(u.id) && u.email)
          emailById[u.id] = u.email.split("@")[0];
      }
    }

    for (const p of typedProfiles)
      nameById[p.id] = p.display_name ?? emailById[p.id] ?? "User";
    for (const id of noProfileIds) nameById[id] = emailById[id] ?? "User";
  }

  // Phase deadline
  const now = new Date();
  const phase1Deadline = firstMatchResult.data?.kickoff_at
    ? new Date(firstMatchResult.data.kickoff_at)
    : null;
  const phase1IsOpen = phase1Deadline ? now < phase1Deadline : false;
  const groupStageOver = phase1Deadline ? now >= phase1Deadline : false;

  const countdown =
    phase1Deadline && phase1IsOpen
      ? (() => {
          const ms = phase1Deadline.getTime() - now.getTime();
          const d = Math.floor(ms / (1000 * 60 * 60 * 24));
          const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          return `${d}d ${h}h`;
        })()
      : null;

  // Preserve membership join order
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const orderedGroups = groupIds
    .map((id) => groupMap.get(id))
    .filter(Boolean) as GroupRow[];

  return (
    <>
      {/* Tournament banner */}
      <div className={styles.banner}>
        <div className={styles.bannerOrb} />
        <div className={styles.bannerLeft}>
          <div className={`eyebrow ${styles.bannerEyebrow}`}>
            {phase1IsOpen ? "Active tournament" : "Tournament"}
          </div>
          <div className={styles.bannerTitle}>{tournamentName}</div>
          <div className={styles.bannerSub}>
            {countdown ? (
              <>
                <strong>Group stage closes in {countdown}</strong>
                {" · "}
                {phase1Deadline ? fmtDate(phase1Deadline) : ""}
              </>
            ) : groupStageOver ? (
              "Knockout phase · Predictions open"
            ) : (
              tournamentRange
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={`eyebrow ${styles.headerEyebrow}`}>Your groups</div>
          <h1 className={styles.title}>Welcome back, {displayName}.</h1>
        </div>
        <Link href="/groups/new" className={styles.createBtn}>
          ＋ Create group
        </Link>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {orderedGroups.map((group) => {
          const groupPicksForGroup = allGroupPicks.filter(
            (p) => p.group_id === group.id,
          );
          const picksByUser: Record<string, GPickRow[]> = {};
          for (const p of groupPicksForGroup) {
            if (!picksByUser[p.user_id]) picksByUser[p.user_id] = [];
            picksByUser[p.user_id].push(p);
          }
          const koBtMap: Record<string, string[]> = {};
          for (const p of allBtPicks.filter((p) => p.group_id === group.id))
            koBtMap[p.user_id] = p.team_ids;
          const koPicksByUser: Record<string, KoPickRow[]> = {};
          for (const p of allKoPicks.filter((p) => p.group_id === group.id)) {
            if (!koPicksByUser[p.user_id]) koPicksByUser[p.user_id] = [];
            koPicksByUser[p.user_id].push(p);
          }

          const standings: StandingRow[] = (membersByGroup[group.id] ?? [])
            .map((uid) => {
              const userPicks = picksByUser[uid] ?? [];
              const groupScore = hasResults
                ? calcGroupScore(userPicks, groupResults)
                : null;
              const btScore = hasBestThird
                ? calcBestThirdScore(koBtMap[uid] ?? [], officialBestThirdIds)
                : null;
              const koScore = hasKnockoutResults
                ? calcKnockoutScore(koPicksByUser[uid] ?? [], knockoutMatches)
                : null;
              const total =
                groupScore !== null
                  ? (groupScore ?? 0) + (btScore ?? 0) + (koScore ?? 0)
                  : null;
              return {
                userId: uid,
                name: nameById[uid] ?? "User",
                you: uid === user!.id,
                points: total,
              };
            })
            .sort((a, b) =>
              a.points !== null && b.points !== null
                ? b.points - a.points
                : a.name.localeCompare(b.name),
            );

          const memberCount = standings.length;
          const isEmpty = memberCount <= 1;
          const isCreator = group.creator_id === user!.id;

          const visibleRows: (StandingRow | null)[] = isEmpty
            ? []
            : standings.slice(0, 3);

          const predictionsOpen = phase1IsOpen && !group.phase1_locked;
          const userGroupPicks = picksByUser[user!.id] ?? [];
          const userKoPicks = koPicksByUser[user!.id] ?? [];
          const groupPicksDone = userGroupPicks.length > 0;

          return (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className={styles.card}
            >
              <div
                className={`${styles.cardAccent} ${!predictionsOpen ? styles.cardAccentDim : ""}`}
              />

              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <div className={styles.nameRow}>
                    <span
                      className={`${styles.nameDot} ${groupPicksDone ? styles.nameDotDone : styles.nameDotNeeded}`}
                    />
                    <div className={styles.cardName}>{group.name}</div>
                    <div className={styles.nameBadges}>
                      <span
                        className={`${styles.namePill} ${groupPicksDone ? styles.pillDone : styles.pillNeeded}`}
                      >
                        {groupPicksDone ? "PICKS DONE" : "PICKS NEEDED"}
                      </span>
                      {groupStageOver &&
                        (() => {
                          const koPicksDone = userKoPicks.length > 0;
                          return (
                            <span
                              className={`${styles.namePill} ${koPicksDone ? styles.pillDone : styles.pillNeeded}`}
                            >
                              KO: {koPicksDone ? "DONE" : "NEEDED"}
                            </span>
                          );
                        })()}
                    </div>
                  </div>
                  <div className={styles.cardMeta}>
                    {group.events && (
                      <span className={styles.tournChip}>
                        <span className={styles.tournDot} />
                        {group.events.name}
                      </span>
                    )}
                    <span className={styles.cardMetaPlayers}>
                      · {memberCount} {memberCount === 1 ? "player" : "players"}
                    </span>
                  </div>
                </div>
                {isCreator && <span className={styles.adminBadge}>Admin</span>}
              </div>

              <div className={styles.miniLb}>
                {isEmpty ? (
                  <div className={styles.emptyLb}>
                    Predictions are open. Standings appear once more players
                    join.
                  </div>
                ) : (
                  visibleRows.map((row, i) =>
                    row === null ? (
                      <div key={`sep-${i}`} className={styles.lbSep}>
                        ···
                      </div>
                    ) : (
                      <div
                        key={row.userId}
                        className={`${styles.lbRow} ${row.you ? styles.lbRowYou : ""}`}
                      >
                        <span className={styles.lbRank}>
                          {row.points == null ? "·" : String(i + 1)}
                        </span>
                        <span
                          className={`${styles.lbAvatar} ${row.you ? styles.lbAvatarYou : ""}`}
                        >
                          {row.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span
                          className={`${styles.lbName} ${row.you ? styles.lbNameYou : ""}`}
                        >
                          {row.you ? `${row.name} (you)` : row.name}
                        </span>
                        <span
                          className={`${styles.lbPoints} ${row.you ? styles.lbPointsYou : ""}`}
                        >
                          {row.points == null ? "—" : row.points}
                        </span>
                      </div>
                    ),
                  )
                )}
              </div>

              <div className={styles.cardFooter}>
                <span
                  className={`${styles.statusPill} ${predictionsOpen ? styles.statusPillOpen : styles.statusPillLocked}`}
                >
                  <span className={styles.statusDot} />
                  {predictionsOpen ? "Predictions open" : "Predictions locked"}
                </span>
                {!hasResults ? (
                  <span className={styles.noScoresHint}>
                    Standings update
                    <br />
                    after first match
                  </span>
                ) : (
                  <span className={styles.viewLink}>View group →</span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Create-new card */}
        <Link href="/groups/new" className={styles.discoverCard}>
          <div>
            <div className={styles.discoverIconWrap}>＋</div>
            <div className={styles.discoverTitle}>Start a new group</div>
            <div className={styles.discoverSub}>
              Family, mates, the office — invite up to 50 players with one link.
            </div>
          </div>
          <div className={styles.discoverBtn}>Create →</div>
        </Link>
      </div>
    </>
  );
}
