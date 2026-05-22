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

const ROUND_SHORT: Record<string, string> = {
  R32: "R32", R16: "R16", QF: "QF", SF: "SF", FINAL: "Final", "3RD": "3rd",
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

    const supabase = createClient();

    if (picks[match.id] === teamId) {
      // Un-pick: remove the selection
      setPicks((prev) => { const next = { ...prev }; delete next[match.id]; return next; });
      setSaveState((prev) => ({ ...prev, [match.id]: "saving" }));
      const { error } = await supabase
        .from("knockout_picks")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .eq("match_id", match.id);
      setSaveState((prev) => ({ ...prev, [match.id]: error ? "error" : "idle" }));
      if (error) setPicks((prev) => ({ ...prev, [match.id]: teamId }));
      return;
    }

    setPicks((prev) => ({ ...prev, [match.id]: teamId }));
    setSaveState((prev) => ({ ...prev, [match.id]: "saving" }));

    const { error } = await supabase
      .from("knockout_picks")
      .upsert(
        { group_id: groupId, user_id: userId, match_id: match.id, winner_id: teamId, updated_at: new Date().toISOString() },
        { onConflict: "group_id,user_id,match_id" }
      );

    if (error) {
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
        <span>{totalPicked} picks saved</span>
      </div>

      <div className={styles.koGrid}>
        {matches.map((match) => {
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

          const cardClasses = [
            styles.koCard,
            pickedId ? styles.koCardPicked : "",
            isFinished ? styles.koCardFinished : "",
            locked && !isFinished ? styles.koCardLocked : "",
          ].filter(Boolean).join(" ");

          return (
            <div key={match.id} className={cardClasses}>
              <div className={styles.koCardMeta}>
                <span className={styles.koCardRound}>{ROUND_SHORT[match.round] ?? match.round}</span>
                <span className={styles.koCardDate}>
                  {new Date(match.kickoff_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {isFinished && match.home_score !== null && (
                  <span className={styles.koCardScore}>{match.home_score}–{match.away_score}</span>
                )}
                {ms === "saving" && <span className={styles.koSaving}>·</span>}
                {ms === "error" && <span className={styles.koError}>!</span>}
              </div>

              <div className={styles.koCardTeams}>
                <button
                  type="button"
                  className={[
                    styles.koTeamBtn,
                    pickedId === match.home_team_id ? styles.koTeamBtnPicked : "",
                    pickedId && pickedId !== match.home_team_id && !isFinished ? styles.koTeamBtnNotPicked : "",
                    actualWinner === match.home_team_id ? styles.koTeamBtnWon : actualWinner && match.home_team_id ? styles.koTeamBtnLost : "",
                    locked || !match.home_team_id || isFinished ? styles.koTeamBtnDisabled : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => match.home_team_id && pickWinner(match, match.home_team_id)}
                  disabled={locked || !match.home_team_id || isFinished}
                >
                  {home ? (
                    <>
                      <span className={styles.koFlag}>{getFlag(home.name)}</span>
                      <span className={styles.koName}>{home.name}</span>
                    </>
                  ) : (
                    <span className={styles.koTbd}>TBD</span>
                  )}
                </button>

                <span className={styles.koCardVs}>vs</span>

                <button
                  type="button"
                  className={[
                    styles.koTeamBtn,
                    pickedId === match.away_team_id ? styles.koTeamBtnPicked : "",
                    pickedId && pickedId !== match.away_team_id && !isFinished ? styles.koTeamBtnNotPicked : "",
                    actualWinner === match.away_team_id ? styles.koTeamBtnWon : actualWinner && match.away_team_id ? styles.koTeamBtnLost : "",
                    locked || !match.away_team_id || isFinished ? styles.koTeamBtnDisabled : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => match.away_team_id && pickWinner(match, match.away_team_id)}
                  disabled={locked || !match.away_team_id || isFinished}
                >
                  {away ? (
                    <>
                      <span className={styles.koFlag}>{getFlag(away.name)}</span>
                      <span className={styles.koName}>{away.name}</span>
                    </>
                  ) : (
                    <span className={styles.koTbd}>TBD</span>
                  )}
                </button>
              </div>

              {isFinished && pickedId && actualWinner && (
                <div className={pickedId === actualWinner ? styles.koCardWon : styles.koCardLost}>
                  {pickedId === actualWinner ? `+${ROUND_POINTS[match.round] ?? 0}` : "✗"}
                </div>
              )}

              {pickedId && !isFinished && (
                <div className={styles.koCardCheck}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
