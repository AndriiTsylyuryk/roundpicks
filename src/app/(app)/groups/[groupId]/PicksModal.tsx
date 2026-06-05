"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagCode } from "@/lib/team-flags";
import Spinner from "@/components/Spinner";
import styles from "./page.module.css";

interface GroupPick {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

interface TeamInfo {
  id: string;
  name: string;
  group_letter: string;
}

interface KnockoutPick {
  match_id: string;
  winner_id: string;
}

interface MatchPrediction {
  match_id: string;
  prediction: "home" | "draw" | "away";
}

interface GroupMatch {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  userName: string;
  userId: string;
  groupMode: string;
}

type PickStatus = "hit" | "partial" | "miss" | "pending";

const ROUND_LABEL: Record<string, string> = {
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  FINAL: "FNL",
  "3RD": "3RD",
};

const KO_ROUND_PTS: Record<string, number> = {
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 4,
  "3RD": 3,
  FINAL: 5,
};

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"];

function teamFlag(name: string) {
  const c = getFlagCode(name);
  if (!c) return <span className={styles.pickFlagFallback}>?</span>;
  return (
    <img
      className={styles.pickFlag}
      src={`https://flagcdn.com/20x15/${c}.png`}
      alt=""
    />
  );
}

function PointsPill({
  pts,
  status,
}: {
  pts: number | null;
  status: PickStatus;
}) {
  if (status === "pending")
    return (
      <span className={`${styles.pointsPill} ${styles.pointsPillPending}`}>
        —
      </span>
    );
  const variantCls =
    status === "hit"
      ? styles.pointsPillHit
      : status === "partial"
        ? styles.pointsPillPartial
        : styles.pointsPillMiss;
  return (
    <span className={`${styles.pointsPill} ${variantCls}`}>
      {pts === 0 ? "0 pts" : `+${pts} ${pts === 1 ? "pt" : "pts"}`}
    </span>
  );
}

function ModalSection({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <details open className={styles.picksSection}>
      <summary className={styles.picksSectionSummary}>
        <span className={styles.picksSectionLabelWrap}>
          <span className={styles.picksSectionLabel}>{label}</span>
          {sub && <span className={styles.picksSectionSub}>{sub}</span>}
        </span>
        <span aria-hidden className={styles.picksSectionChevron}>
          ▾
        </span>
      </summary>
      <div className={styles.picksSectionBody}>{children}</div>
    </details>
  );
}

function PredRow({
  left,
  pick,
  actual,
  status,
  pts,
  isLast,
}: {
  left: string;
  pick: string;
  actual: string | null;
  status: PickStatus;
  pts: number | null;
  isLast?: boolean;
}) {
  return (
    <div
      className={`${styles.picksPredRow}${isLast ? ` ${styles.picksPredRowLast}` : ""}`}
    >
      <span className={styles.picksPredLeft}>{left}</span>
      <div>
        <div className={styles.picksPredColLabel}>Your pick</div>
        <div
          className={`${styles.picksPredColValue}${status === "miss" ? ` ${styles.picksPredColValueMiss}` : ""}`}
        >
          {pick}
        </div>
      </div>
      <div>
        <div className={styles.picksPredColLabel}>Actual</div>
        <div
          className={`${styles.picksPredColValue}${status === "pending" ? ` ${styles.picksPredColValuePending}` : ""}`}
        >
          {actual ?? "—"}
        </div>
      </div>
      <PointsPill pts={pts} status={status} />
    </div>
  );
}

export default function PicksModal({
  isOpen,
  onClose,
  groupId,
  userName,
  userId,
  groupMode,
}: Props) {
  const [teams, setTeams] = useState<Map<string, TeamInfo>>(new Map());
  const [groupPicks, setGroupPicks] = useState<GroupPick[]>([]);
  const [bestThirdIds, setBestThirdIds] = useState<string[]>([]);
  const [knockoutPicks, setKnockoutPicks] = useState<KnockoutPick[]>([]);
  const [matches, setMatches] = useState<
    {
      id: string;
      round: string;
      home_team_id: string | null;
      away_team_id: string | null;
      home_score: number | null;
      away_score: number | null;
      status: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [groupResults, setGroupResults] = useState<
    {
      wc_group: string;
      rank1_id: string | null;
      rank2_id: string | null;
      rank3_id: string | null;
    }[]
  >([]);
  const [officialBestThird, setOfficialBestThird] = useState<string[]>([]);
  const [matchPredictions, setMatchPredictions] = useState<MatchPrediction[]>(
    [],
  );
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const { data: teamsRaw } = await supabase
        .from("wc_teams")
        .select("id, name, group_letter")
        .order("group_letter")
        .order("name");
      const teamMap = new Map((teamsRaw ?? []).map((t: TeamInfo) => [t.id, t]));
      setTeams(teamMap);

      const { data: picksRaw } = await supabase
        .from("group_picks")
        .select("wc_group, rank1_id, rank2_id, rank3_id")
        .eq("group_id", groupId)
        .eq("user_id", userId);
      setGroupPicks(picksRaw ?? []);

      const { data: bestThirdRaw } = await supabase
        .from("best_third_picks")
        .select("team_ids")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle();
      setBestThirdIds(bestThirdRaw?.team_ids ?? []);

      const { data: knockoutPicksRaw } = await supabase
        .from("knockout_picks")
        .select("match_id, winner_id")
        .eq("group_id", groupId)
        .eq("user_id", userId);
      setKnockoutPicks(knockoutPicksRaw ?? []);

      const { data: koMatchesRaw } = await supabase
        .from("wc_matches")
        .select(
          "id, round, home_team_id, away_team_id, home_score, away_score, status",
        )
        .in("round", ["R32", "R16", "QF", "SF", "FINAL", "3RD"]);
      setMatches(koMatchesRaw ?? []);

      const { data: finishedGroupRaw } = await supabase
        .from("wc_matches")
        .select("home_team_id, away_team_id, home_score, away_score, status")
        .eq("round", "GROUP")
        .eq("status", "finished");
      const wcTeamsRaw = (teamsRaw ?? []) as {
        id: string;
        group_letter: string;
      }[];
      const { deriveGroupStandings } = await import("@/lib/scoring");
      const results = deriveGroupStandings(finishedGroupRaw ?? [], wcTeamsRaw);
      setGroupResults(results);

      const thirdPlaceIds = new Set(
        results
          .map((r: { rank3_id: string | null }) => r.rank3_id)
          .filter((id: string | null): id is string => id !== null),
      );
      const r32TeamIds = new Set(
        (koMatchesRaw ?? [])
          .filter((m: { round: string }) => m.round === "R32")
          .flatMap(
            (m: {
              home_team_id: string | null;
              away_team_id: string | null;
            }) => [m.home_team_id, m.away_team_id],
          )
          .filter((id: string | null): id is string => id !== null),
      );
      const official =
        r32TeamIds.size > 0
          ? [...thirdPlaceIds].filter((id: string) => r32TeamIds.has(id))
          : [];
      setOfficialBestThird(official);

      if (groupMode === "advanced") {
        const { data: mpRaw } = await supabase
          .from("match_predictions")
          .select("match_id, prediction")
          .eq("group_id", groupId)
          .eq("user_id", userId);
        setMatchPredictions((mpRaw ?? []) as MatchPrediction[]);

        const { data: gmRaw } = await supabase
          .from("wc_matches")
          .select(
            "id, home_team_id, away_team_id, status, home_score, away_score",
          )
          .eq("round", "GROUP")
          .order("kickoff_at");
        setGroupMatches((gmRaw ?? []) as GroupMatch[]);
      }

      setLoading(false);
    })();
  }, [isOpen, groupId, userId, groupMode]);

  if (!isOpen) return null;

  const tm = (id: string | null) => (id ? (teams.get(id) ?? null) : null);
  const groupPicksByGroup = new Map(groupPicks.map((p) => [p.wc_group, p]));
  const officialBestThirdSet = new Set(officialBestThird);
  const matchPredMap = new Map(
    matchPredictions.map((mp) => [mp.match_id, mp.prediction]),
  );

  const groupPickStatus = (
    pickTeamId: string | null,
    group: string,
    rankIndex: number,
  ): PickStatus => {
    const result = groupResults.find((r) => r.wc_group === group);
    if (!result || !pickTeamId || result.rank1_id === null) return "pending";
    const officialIds = [result.rank1_id, result.rank2_id, result.rank3_id];
    if (officialIds[rankIndex] === pickTeamId) return "hit";
    if (officialIds.includes(pickTeamId)) return "partial";
    return "miss";
  };

  const groupPickPts = (status: PickStatus): number | null => {
    if (status === "pending") return null;
    return status === "hit" ? 2 : status === "partial" ? 1 : 0;
  };

  const knockPickStatus = (
    matchId: string,
    winnerId: string | null,
  ): PickStatus => {
    const match = matches.find((m) => m.id === matchId);
    if (
      !match ||
      match.status !== "finished" ||
      match.home_score === null ||
      match.away_score === null
    )
      return "pending";
    const actual =
      match.home_score > match.away_score
        ? match.home_team_id
        : match.away_score > match.home_score
          ? match.away_team_id
          : null;
    if (actual === null) return "pending";
    return actual === winnerId ? "hit" : "miss";
  };

  const bestThirdStatus = (tid: string): PickStatus => {
    if (officialBestThird.length === 0) return "pending";
    return officialBestThirdSet.has(tid) ? "hit" : "miss";
  };

  const getMatchPredStatus = (matchId: string): PickStatus => {
    const pred = matchPredMap.get(matchId);
    if (pred === undefined) return "pending";
    const m = groupMatches.find((gm) => gm.id === matchId);
    if (
      !m ||
      m.status !== "finished" ||
      m.home_score === null ||
      m.away_score === null
    )
      return "pending";
    const actual =
      m.home_score > m.away_score
        ? "home"
        : m.home_score < m.away_score
          ? "away"
          : "draw";
    return actual === pred ? "hit" : "miss";
  };

  const groupedGroupMatches: [string, GroupMatch[]][] = (() => {
    const map = new Map<string, GroupMatch[]>();
    for (const m of groupMatches) {
      const t =
        teams.get(m.home_team_id ?? "") ?? teams.get(m.away_team_id ?? "");
      const letter = (t as TeamInfo | undefined)?.group_letter;
      if (!letter) continue;
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  })();

  // Collect all statuses for the header stats chips
  const groupStatuses: PickStatus[] = groupPicks.flatMap((p) =>
    ([p.rank1_id, p.rank2_id] as const).map((tid, i) =>
      groupPickStatus(tid, p.wc_group, i),
    ),
  );
  const btStatuses: PickStatus[] = bestThirdIds.map(bestThirdStatus);
  const koStatuses: PickStatus[] = knockoutPicks.map((kp) =>
    knockPickStatus(kp.match_id, kp.winner_id),
  );
  const mpStatuses: PickStatus[] = matchPredictions.map((mp) =>
    getMatchPredStatus(mp.match_id),
  );
  const allStatuses = [
    ...groupStatuses,
    ...btStatuses,
    ...koStatuses,
    ...mpStatuses,
  ];

  const exact = allStatuses.filter((s) => s === "hit").length;
  const partial = allStatuses.filter((s) => s === "partial").length;
  const wrong = allStatuses.filter((s) => s === "miss").length;
  const pending = allStatuses.filter((s) => s === "pending").length;

  // Points earned
  const groupPtsTotal = groupPicks.reduce(
    (sum, p) =>
      sum +
      ([p.rank1_id, p.rank2_id] as const).reduce((s, tid, i) => {
        const st = groupPickStatus(tid, p.wc_group, i);
        return s + (groupPickPts(st) ?? 0);
      }, 0),
    0,
  );
  const btPtsTotal = bestThirdIds.reduce(
    (sum, tid) => sum + (bestThirdStatus(tid) === "hit" ? 2 : 0),
    0,
  );
  const koPtsTotal = knockoutPicks.reduce((sum, kp) => {
    if (knockPickStatus(kp.match_id, kp.winner_id) !== "hit") return sum;
    const match = matches.find((m) => m.id === kp.match_id);
    return sum + (match ? (KO_ROUND_PTS[match.round] ?? 0) : 0);
  }, 0);
  const mpPtsTotal = matchPredictions.reduce(
    (sum, mp) => sum + (getMatchPredStatus(mp.match_id) === "hit" ? 1 : 0),
    0,
  );
  const pointsEarned = groupPtsTotal + btPtsTotal + koPtsTotal + mpPtsTotal;

  const koMatchCount = matches.filter((m) => m.status === "finished").length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Predictions by ${userName}`}
      className={styles.picksOverlay}
      onClick={onClose}
    >
      <div
        className={styles.picksContainer}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className={styles.picksHeader}>
          <div className={styles.picksHeaderInner}>
            <div className={styles.picksHeaderLeft}>
              <span className={styles.picksEyebrow}>
                Your predictions ·{" "}
                {groupMode === "advanced" ? "Advanced" : "Simple"}
              </span>
              <h2 className={styles.picksHeaderName}>{userName}</h2>
              <div className={styles.picksHeaderStats}>
                <span className={styles.picksPointsBadge}>
                  <strong className={styles.picksPointsBadgeNum}>
                    {pointsEarned}
                  </strong>
                  <span className={styles.picksPointsBadgeLabel}>
                    pts so far
                  </span>
                </span>
                <SummaryChip dotColor="#7cd49b" label="exact" value={exact} />
                <SummaryChip
                  dotColor="#5fc7e0"
                  label="partial"
                  value={partial}
                />
                <SummaryChip dotColor="#e88898" label="wrong" value={wrong} />
                <SummaryChip muted label="pending" value={pending} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={styles.picksModalClose}
            >
              ×
            </button>
          </div>
        </header>

        {/* Body */}
        <div className={styles.picksBody}>
          {loading ? (
            <div className={styles.picksLoadingWrap}>
              <Spinner size={48} />
            </div>
          ) : (
            <>
              {/* Group stage rankings */}
              <ModalSection
                label="Group stage rankings"
                sub={`${groupPicks.length} groups · ranked 1st–2nd · 2 pts exact, 1 pt right team`}
              >
                {groupPicks.length === 0 ? (
                  <p className={styles.picksEmpty}>No group picks yet</p>
                ) : (
                  <div className={styles.picksGroupGrid}>
                    {[...groupPicksByGroup.entries()]
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([letter, pick]) => (
                        <div key={letter} className={styles.picksGroupCard}>
                          <div className={styles.picksGroupCardHeader}>
                            Group {letter}
                          </div>
                          {(
                            [
                              [pick.rank1_id, "1st"],
                              [pick.rank2_id, "2nd"],
                            ] as [string | null, string][]
                          ).map(([tid, pos], i) => {
                            const team = tm(tid);
                            const status = groupPickStatus(tid, letter, i);
                            const pts = groupPickPts(status);
                            return (
                              <div key={pos} className={styles.picksPosRow}>
                                <span className={styles.picksPosNum}>
                                  {pos}
                                </span>
                                <span>{team ? teamFlag(team.name) : null}</span>
                                <span
                                  className={`${styles.picksTeamName}${status === "pending" ? ` ${styles.picksTeamNamePending}` : ""}`}
                                >
                                  {team?.name ?? "—"}
                                </span>
                                <PointsPill pts={pts} status={status} />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                )}
              </ModalSection>

              {/* Advanced: group stage matches */}
              {groupMode === "advanced" && (
                <ModalSection
                  label="Group stage matches"
                  sub={`${matchPredictions.length} predictions · W / D / L per match`}
                >
                  {groupMatches.length === 0 ? (
                    <p className={styles.picksEmpty}>
                      No match predictions yet
                    </p>
                  ) : (
                    groupedGroupMatches.flatMap(([, gMatches]) =>
                      gMatches.map((match, mi) => {
                        const homeTeam = tm(match.home_team_id);
                        const awayTeam = tm(match.away_team_id);
                        const pred = matchPredMap.get(match.id);
                        const status = getMatchPredStatus(match.id);
                        const abbr = (team: { name: string } | null) =>
                          (
                            getFlagCode(team?.name ?? "") ??
                            team?.name?.slice(0, 2) ??
                            "?"
                          ).toUpperCase();
                        const predLabel =
                          pred === "home"
                            ? (homeTeam?.name ?? "Home")
                            : pred === "away"
                              ? (awayTeam?.name ?? "Away")
                              : pred === "draw"
                                ? "Draw"
                                : "—";
                        const resultLabel =
                          match.status === "finished" &&
                          match.home_score !== null &&
                          match.away_score !== null
                            ? `${match.home_score}–${match.away_score}`
                            : null;
                        const matchPts = status === "hit" ? 1 : status === "pending" ? null : 0;
                        const isLast = mi === gMatches.length - 1;
                        return (
                          <PredRow
                            key={match.id}
                            left={`${abbr(homeTeam)} vs ${abbr(awayTeam)}`}
                            pick={predLabel}
                            actual={resultLabel}
                            status={status}
                            pts={matchPts}
                            isLast={isLast}
                          />
                        );
                      }),
                    )
                  )}
                </ModalSection>
              )}

              {/* Best 3rd-place teams */}
              <ModalSection
                label="Best 3rd-place teams"
                sub="8 picks · top 8 third-place finishers advance"
              >
                {bestThirdIds.length === 0 ? (
                  <p className={styles.picksEmpty}>No best third picks yet</p>
                ) : (
                  <div className={styles.picksThirdGrid}>
                    {bestThirdIds.map((tid, i) => {
                      const team = tm(tid);
                      const status = bestThirdStatus(tid);
                      const pts = status === "hit" ? 2 : status === "pending" ? null : 0;
                      const isLastRow = i >= bestThirdIds.length - 2;
                      const isLeft = i % 2 === 0;
                      return (
                        <div
                          key={tid}
                          className={[
                            styles.picksThirdCell,
                            !isLastRow ? styles.picksThirdCellBorderBottom : "",
                            isLeft ? styles.picksThirdCellBorderRight : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span
                            className={`${styles.picksThirdTeam}${status === "pending" ? ` ${styles.picksThirdTeamPending}` : status === "miss" ? ` ${styles.picksThirdTeamMiss}` : ""}`}
                          >
                            {team ? (
                              <>
                                {teamFlag(team.name)} {team.name}
                              </>
                            ) : (
                              "—"
                            )}
                          </span>
                          <PointsPill pts={pts} status={status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </ModalSection>

              {/* Knockout matches */}
              <ModalSection
                label="Knockout matches"
                sub={`${koMatchCount} of ${matches.length} played`}
              >
                {matches.length === 0 ? (
                  <p className={styles.picksEmpty}>No knockout matches yet</p>
                ) : (
                  ROUND_ORDER.flatMap((round) => {
                    const roundMatches = matches.filter(
                      (m) => m.round === round,
                    );
                    return roundMatches.map((match, mi) => {
                      const kp = knockoutPicks.find(
                        (p) => p.match_id === match.id,
                      );
                      const winner = kp ? tm(kp.winner_id) : null;
                      const actualId =
                        match.status === "finished" &&
                        match.home_score !== null &&
                        match.away_score !== null
                          ? match.home_score > match.away_score
                            ? match.home_team_id
                            : match.away_score > match.home_score
                              ? match.away_team_id
                              : null
                          : null;
                      const actual = tm(actualId);
                      const status = kp
                        ? knockPickStatus(match.id, kp.winner_id)
                        : "pending";
                      const koPts = status === "hit"
                        ? (KO_ROUND_PTS[match.round] ?? 0)
                        : status === "pending" ? null : 0;
                      const totalMatches = matches.length;
                      const flatIndex =
                        ROUND_ORDER.slice(0, ROUND_ORDER.indexOf(round)).reduce(
                          (sum, r) =>
                            sum + matches.filter((m) => m.round === r).length,
                          0,
                        ) + mi;
                      return (
                        <PredRow
                          key={match.id}
                          left={`${ROUND_LABEL[round]} · ${mi + 1}`}
                          pick={winner ? winner.name : "—"}
                          actual={actual ? actual.name : null}
                          status={status}
                          pts={koPts}
                          isLast={flatIndex === totalMatches - 1}
                        />
                      );
                    });
                  })
                )}
              </ModalSection>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className={styles.picksFooter}>
          <span className={styles.picksFooterNote}>
            {" "}
            Picks are scored as matches finish.
          </span>
          <button
            type="button"
            onClick={onClose}
            className={styles.picksFooterClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function SummaryChip({
  dotColor,
  muted,
  label,
  value,
}: {
  dotColor?: string;
  muted?: boolean;
  label: string;
  value: number;
}) {
  return (
    <span
      className={`${styles.picksSummaryChip}${muted ? ` ${styles.picksSummaryChipMuted}` : ""}`}
    >
      {dotColor && (
        <span
          aria-hidden
          className={styles.picksSummaryChipDot}
          style={{ backgroundColor: dotColor }}
        />
      )}
      <strong className={styles.picksSummaryChipNum}>{value}</strong> {label}
    </span>
  );
}
