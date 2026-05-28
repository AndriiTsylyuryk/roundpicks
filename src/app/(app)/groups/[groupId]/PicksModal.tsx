"use client";

import { useEffect, useState } from "react";
import Modal from "react-modal";
import { createClient } from "@/lib/supabase/client";
import { getFlagCode } from "@/lib/team-flags";
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  userName: string;
  userId: string;
}

const ROUND_LABEL: Record<string, string> = {
  R32: "R32", R16: "R16", QF: "QF", SF: "SF", FINAL: "FINAL", "3RD": "3RD",
};

const teamFlag = (name: string, cls = styles.pickFlag) => {
  const c = getFlagCode(name);
  if (!c) return <span className={styles.pickFlagFallback}>?</span>;
  const cc = c.length > 2 ? c.slice(0, 2) : c;
  return <img className={cls} src={`https://flagcdn.com/20x15/${cc}.png`} alt="" />;
};

export default function PicksModal({ isOpen, onClose, groupId, userName, userId }: Props) {
  const [teams, setTeams] = useState<Map<string, TeamInfo>>(new Map());
  const [groupPicks, setGroupPicks] = useState<GroupPick[]>([]);
  const [bestThirdIds, setBestThirdIds] = useState<string[]>([]);
  const [knockoutPicks, setKnockoutPicks] = useState<KnockoutPick[]>([]);
  const [matches, setMatches] = useState<{ id: string; round: string; home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null; status: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupResults, setGroupResults] = useState<{ wc_group: string; rank1_id: string | null; rank2_id: string | null; rank3_id: string | null }[]>([]);
  const [officialBestThird, setOfficialBestThird] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      Modal.setAppElement(document.body);
    }
  }, []);

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
        .select("id, round, home_team_id, away_team_id, home_score, away_score, status")
        .in("round", ["R32", "R16", "QF", "SF", "FINAL", "3RD"]);
      setMatches(koMatchesRaw ?? []);

      const { data: finishedGroupRaw } = await supabase
        .from("wc_matches")
        .select("home_team_id, away_team_id, home_score, away_score, status")
        .eq("round", "GROUP")
        .eq("status", "finished");
      const wcTeamsRaw = (teamsRaw ?? []) as { id: string; group_letter: string }[];
      const { deriveGroupStandings } = await import("@/lib/scoring");
      const results = deriveGroupStandings(finishedGroupRaw ?? [], wcTeamsRaw);
      setGroupResults(results);

      const thirdPlaceIds = new Set(results.map((r: { rank3_id: string | null }) => r.rank3_id).filter((id: string | null): id is string => id !== null));
      const r32TeamIds = new Set(
        (koMatchesRaw ?? [])
          .filter((m: { round: string }) => m.round === "R32")
          .flatMap((m: { home_team_id: string | null; away_team_id: string | null }) => [m.home_team_id, m.away_team_id])
          .filter((id: string | null): id is string => id !== null)
      );
      const official = r32TeamIds.size > 0 ? [...thirdPlaceIds].filter((id: string) => r32TeamIds.has(id)) : [];
      setOfficialBestThird(official);

      setLoading(false);
    })();
  }, [isOpen, groupId, userId]);

  const tm = (id: string | null) => (id && teams.get(id)) ?? null;

  const groupPicksByGroup = new Map(groupPicks.map((p) => [p.wc_group, p]));
  const officialBestThirdSet = new Set(officialBestThird);

  const actualGroupRank = (group: string, rankIndex: number) => {
    const result = groupResults.find((r) => r.wc_group === group);
    if (!result) return null;
    const ids = [result.rank1_id, result.rank2_id, result.rank3_id];
    return tm(ids[rankIndex]);
  };

  const groupPickStatus = (pickTeamId: string | null, group: string, rankIndex: number) => {
    const result = groupResults.find((r) => r.wc_group === group);
    if (!result || !pickTeamId || result.rank1_id === null) return "pending";
    const officialIds = [result.rank1_id, result.rank2_id, result.rank3_id];
    if (officialIds[rankIndex] === pickTeamId) return "correct";
    if (officialIds.includes(pickTeamId)) return "wrong-rank";
    return "wrong";
  };

  const pickIcon = (status: string) => {
    if (status === "correct") return <span className={styles.pickIconCorrect}>✓</span>;
    if (status === "wrong-rank" || status === "wrong") return <span className={styles.pickIconWrong}>✕</span>;
    return <span className={styles.pickIconPending}>·</span>;
  };

  const knockPickStatus = (matchId: string, winnerId: string | null) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match || match.status !== "finished" || match.home_score === null || match.away_score === null) return "pending";
    const actual = match.home_score > match.away_score ? match.home_team_id : match.away_score > match.home_score ? match.away_team_id : null;
    if (actual === null) return "pending";
    return actual === winnerId ? "correct" : "wrong";
  };

  // Stats
  const allGroupRankCount = groupPicks.length * 2; // count 1st and 2nd only

  let correctGroup = 0, wrongGroup = 0;
  for (const p of groupPicks) {
    const result = groupResults.find((r) => r.wc_group === p.wc_group);
    if (!result || result.rank1_id === null) continue;
    for (let i = 0; i < 2; i++) {
      const tid = [p.rank1_id, p.rank2_id][i];
      const official = [result.rank1_id, result.rank2_id, result.rank3_id][i];
      if (tid && official === tid) correctGroup++;
      else if (tid && official !== null) wrongGroup++;
    }
  }

  const bestThirdResultKnown = officialBestThird.length > 0;
  const correctBestThird = bestThirdResultKnown ? bestThirdIds.filter((id) => officialBestThirdSet.has(id)).length : 0;
  const wrongBestThird = bestThirdResultKnown ? bestThirdIds.length - correctBestThird : 0;

  const correctKo = knockoutPicks.filter((kp) => knockPickStatus(kp.match_id, kp.winner_id) === "correct").length;
  const wrongKo = knockoutPicks.filter((kp) => knockPickStatus(kp.match_id, kp.winner_id) === "wrong").length;
  const pickedKo = new Set(knockoutPicks.map((kp) => kp.match_id));
  const unpickedKo = matches.length - pickedKo.size;
  const pendingKo = knockoutPicks.filter((kp) => knockPickStatus(kp.match_id, kp.winner_id) === "pending").length + unpickedKo;

  const totalCorrect = correctGroup + correctBestThird + correctKo;
  const totalWrong = wrongGroup + wrongBestThird + wrongKo;
  const totalPending = (allGroupRankCount - correctGroup - wrongGroup) + (!bestThirdResultKnown ? bestThirdIds.length : 0) + pendingKo;
  const totalOverall = allGroupRankCount + bestThirdIds.length + matches.length;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className={styles.picksModal}
      overlayClassName={styles.picksModalOverlay}
      closeTimeoutMS={200}
    >
      <div className={styles.picksModalInner}>
        <header className={styles.picksModalHeader}>
          <div className={styles.picksModalHeaderTop}>
            <span className={styles.picksModalEyebrow}>Your predictions · {userName}</span>
            <button className={styles.picksModalClose} onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className={styles.picksModalHeaderName}>{userName}</div>
        </header>

        <div className={styles.picksModalStats}>
          <span className={styles.pickStatCorrect}>{totalCorrect} correct</span>
          <span className={styles.pickStatWrong}>{totalWrong} wrong</span>
          <span className={styles.pickStatPending}>{totalPending} pending</span>
          <span className={styles.pickStatTotal}>of {totalOverall} total</span>
        </div>

        <div className={styles.picksModalBody}>
          {loading ? (
            <p className={styles.picksLoading}>Loading picks…</p>
          ) : (
            <>
              {/* ── Group stage rankings ── */}
              <section className={styles.picksSection}>
                <h3 className={styles.picksSectionTitle}>Group stage rankings</h3>
                <p className={styles.picksSectionSub}>6 groups · 1st & 2nd in each</p>
                {groupPicks.length === 0 ? (
                  <p className={styles.picksEmpty}>No group picks yet</p>
                ) : (
                  <div className={styles.pickGroupList}>
                    {[...groupPicksByGroup.entries()]
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([letter, pick]) => (
                        <div key={letter} className={styles.pickGroupRow}>
                          {[0, 1].map((rankI) => {
                            const tid = [pick.rank1_id, pick.rank2_id][rankI];
                            const team = tm(tid);
                            const actual = actualGroupRank(letter, rankI);
                            const status = groupPickStatus(tid, letter, rankI);
                            return (
                              <div key={rankI} className={styles.pickGroupSlot}>
                                <div className={styles.pickGroupSlotHeader}>
                                  GROUP {letter} · {["1ST", "2ND"][rankI]}
                                </div>
                                <div className={styles.pickGroupSlotRow}>
                                  <span className={styles.pickGroupSlotLabel}>Your pick</span>
                                  <span className={styles.pickGroupSlotValue}>
                                    {team ? (
                                      <>{teamFlag(team.name)} {team.name}</>
                                    ) : (
                                      <span className={styles.pickEmptySlot}>—</span>
                                    )}
                                  </span>
                                </div>
                                <div className={styles.pickGroupSlotRow}>
                                  <span className={styles.pickGroupSlotLabel}>Actual</span>
                                  <span className={styles.pickGroupSlotValue}>
                                    {actual ? (
                                      <>{teamFlag(actual.name)} {actual.name}</>
                                    ) : (
                                      <span className={styles.pickEmptySlot}>TBC</span>
                                    )}
                                  </span>
                                  {status !== "pending" && pickIcon(status)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* ── Best 3rd-place teams ── */}
              <section className={styles.picksSection}>
                <h3 className={styles.picksSectionTitle}>Best 3rd-place teams</h3>
                <p className={styles.picksSectionSub}>8 picks · top 8 third-place finishers advance</p>
                {bestThirdIds.length === 0 ? (
                  <p className={styles.picksEmpty}>No best third picks yet</p>
                ) : (
                  <div className={styles.pickThirdList}>
                    {bestThirdIds.map((tid) => {
                      const team = tm(tid);
                      const resultKnown = officialBestThird.length > 0;
                      const isOfficial = officialBestThirdSet.has(tid);
                      return (
                        <span key={tid} className={styles.pickThirdItem}>
                          {team ? (
                            <>{teamFlag(team.name)} {team.name}</>
                          ) : (
                            <span className={styles.pickEmptySlot}>—</span>
                          )}
                          {resultKnown && (
                            <span className={isOfficial ? styles.pickIconCorrect : styles.pickIconWrong}>
                              {isOfficial ? "✓" : "✕"}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Knockout matches ── */}
              <section className={styles.picksSection}>
                <h3 className={styles.picksSectionTitle}>Knockout matches</h3>
                <p className={styles.picksSectionSub}>{matches.filter((m) => m.status === "finished").length} of {matches.length} played</p>
                {matches.length === 0 ? (
                  <p className={styles.picksEmpty}>No knockout matches yet</p>
                ) : (
                  <div className={styles.pickKoList}>
                    {ROUND_ORDER.map((round) => {
                      const roundMatches = matches.filter((m) => m.round === round);
                      if (roundMatches.length === 0) return null;
                      return roundMatches.map((match, mi) => {
                        const kp = knockoutPicks.find((p) => p.match_id === match.id);
                        const winner = kp ? tm(kp.winner_id) : null;
                        const actualId = match.status === "finished" && match.home_score !== null && match.away_score !== null
                          ? (match.home_score > match.away_score ? match.home_team_id : match.away_score > match.home_score ? match.away_team_id : null)
                          : null;
                        const actual = tm(actualId);
                        const status = kp ? knockPickStatus(match.id, kp.winner_id) : "pending";
                        return (
                          <div key={match.id} className={styles.pickKoRow}>
                            <div className={styles.pickKoHeader}>{ROUND_LABEL[round]} · M{mi + 1}</div>
                            <div className={styles.pickKoSlotRow}>
                              <span className={styles.pickGroupSlotLabel}>Your pick</span>
                              <span className={styles.pickGroupSlotValue}>
                                {winner ? <>{teamFlag(winner.name)} {winner.name}</> : <span className={styles.pickEmptySlot}>—</span>}
                              </span>
                            </div>
                            <div className={styles.pickKoSlotRow}>
                              <span className={styles.pickGroupSlotLabel}>Actual</span>
                              <span className={styles.pickGroupSlotValue}>
                                {actual ? <>{teamFlag(actual.name)} {actual.name}</> : <span className={styles.pickEmptySlot}>TBC</span>}
                              </span>
                              {kp && status !== "pending" && pickIcon(status)}
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "FINAL", "3RD"];
