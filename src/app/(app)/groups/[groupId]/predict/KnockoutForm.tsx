"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/team-flags";
import { ROUND_POINTS } from "@/lib/scoring";
import styles from "./page.module.css";

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

interface Team {
  id: string;
  name: string;
}

interface Props {
  groupId: string;
  userId: string;
  matches: WcMatch[];
  teams: Team[];
  existingPicks: { match_id: string; winner_id: string }[];
}

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "FINAL", "3RD"];
const ROUND_LABELS: Record<string, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter Finals",
  SF: "Semi Finals",
  FINAL: "Final",
  "3RD": "3rd Place Match",
};

type MatchSaveState = "idle" | "saving" | "saved" | "error";

export default function KnockoutForm({ groupId, userId, matches, teams, existingPicks }: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(
    () => Object.fromEntries(existingPicks.map((p) => [p.match_id, p.winner_id]))
  );
  const [saveState, setSaveState] = useState<Record<string, MatchSaveState>>({});

  const teamById = new Map(teams.map((t) => [t.id, t]));

  function isMatchLocked(match: WcMatch): boolean {
    return new Date() >= new Date(match.kickoff_at);
  }

  async function pickWinner(match: WcMatch, teamId: string) {
    if (isMatchLocked(match) || match.status === "finished" || !teamId) return;
    if (picks[match.id] === teamId) return;

    setPicks((prev) => ({ ...prev, [match.id]: teamId }));
    setSaveState((prev) => ({ ...prev, [match.id]: "saving" }));

    const supabase = createClient();
    const { error } = await supabase
      .from("knockout_picks")
      .upsert(
        { group_id: groupId, user_id: userId, match_id: match.id, winner_id: teamId, updated_at: new Date().toISOString() },
        { onConflict: "group_id,user_id,match_id" }
      );

    if (error) {
      // Revert optimistic update
      setPicks((prev) => {
        const next = { ...prev };
        const original = existingPicks.find((p) => p.match_id === match.id);
        if (original) next[match.id] = original.winner_id;
        else delete next[match.id];
        return next;
      });
      setSaveState((prev) => ({ ...prev, [match.id]: "error" }));
    } else {
      setSaveState((prev) => ({ ...prev, [match.id]: "saved" }));
    }
  }

  const matchesByRound: Record<string, WcMatch[]> = {};
  for (const m of matches) {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  }

  const openMatches = matches.filter((m) => !isMatchLocked(m) && m.home_team_id && m.away_team_id && m.status !== "finished");
  const pickedOpen = openMatches.filter((m) => picks[m.id]).length;
  const totalPicked = matches.filter((m) => picks[m.id]).length;

  if (matches.length === 0) {
    return (
      <div className={styles.noTeams}>
        <p>⚽ Knockout fixtures haven&apos;t been synced yet. The admin will sync them when the knockout stage begins.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.progress}>
        <span>{pickedOpen}/{openMatches.length} open matches</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${openMatches.length > 0 ? (pickedOpen / openMatches.length) * 100 : 100}%` }} />
        </div>
        <span>{totalPicked} picks saved total</span>
      </div>

      {ROUND_ORDER.filter((r) => matchesByRound[r]?.length > 0).map((round) => (
        <div key={round} className={styles.koRound}>
          <h3 className={styles.koRoundTitle}>{ROUND_LABELS[round]}</h3>
          <div className={styles.koMatches}>
            {matchesByRound[round].map((match) => {
              const home = match.home_team_id ? teamById.get(match.home_team_id) : null;
              const away = match.away_team_id ? teamById.get(match.away_team_id) : null;
              const pickedId = picks[match.id];
              const isFinished = match.status === "finished";
              const locked = isMatchLocked(match);
              const ms = saveState[match.id] ?? "idle";
              const actualWinner =
                isFinished && match.home_score !== null && match.away_score !== null
                  ? match.home_score > match.away_score
                    ? match.home_team_id
                    : match.away_score > match.home_score
                    ? match.away_team_id
                    : null
                  : null;

              return (
                <div key={match.id} className={styles.koMatch}>
                  <div className={styles.koMatchDate}>
                    {new Date(match.kickoff_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {isFinished && match.home_score !== null ? (
                      <span className={styles.koScore}> · {match.home_score}–{match.away_score}</span>
                    ) : locked ? (
                      <span className={styles.koLockBadge}> 🔒 locked</span>
                    ) : (
                      <span className={styles.koOpen}> · open</span>
                    )}
                    {ms === "saving" && <span className={styles.koSaving}> saving…</span>}
                    {ms === "saved" && <span className={styles.koSaved}> ✓</span>}
                    {ms === "error" && <span className={styles.koError}> ✗ error</span>}
                    {isFinished && pickedId && actualWinner && (
                      <span className={pickedId === actualWinner ? styles.koPointsWon : styles.koPointsMissed}>
                        {pickedId === actualWinner ? ` +${ROUND_POINTS[match.round] ?? 0} pts` : " ✗"}
                      </span>
                    )}
                  </div>
                  <div className={styles.koTeams}>
                    {[
                      { teamId: match.home_team_id, team: home },
                      { teamId: match.away_team_id, team: away },
                    ].map(({ teamId, team }) => (
                      <button
                        key={teamId ?? "tbd"}
                        type="button"
                        className={[
                          styles.koTeamBtn,
                          pickedId === teamId ? styles.koTeamBtnPicked : "",
                          actualWinner === teamId ? styles.koTeamBtnWon : actualWinner && teamId ? styles.koTeamBtnLost : "",
                          locked || !teamId || isFinished ? styles.koTeamBtnDisabled : "",
                        ].join(" ")}
                        onClick={() => teamId && pickWinner(match, teamId)}
                        disabled={locked || !teamId || isFinished}
                      >
                        {team ? (
                          <>
                            <span className={styles.koFlag}>{getFlag(team.name)}</span>
                            <span className={styles.koName}>{team.name}</span>
                          </>
                        ) : (
                          <span className={styles.koTbd}>TBD</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
