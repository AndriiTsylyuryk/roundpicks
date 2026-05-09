"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/team-flags";
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
  isLocked: boolean;
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

export default function KnockoutForm({ groupId, userId, matches, teams, existingPicks, isLocked }: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(
    () => Object.fromEntries(existingPicks.map((p) => [p.match_id, p.winner_id]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const teamById = new Map(teams.map((t) => [t.id, t]));

  function pickWinner(matchId: string, teamId: string) {
    if (isLocked) return;
    setPicks((prev) => {
      if (prev[matchId] === teamId) {
        const next = { ...prev };
        delete next[matchId];
        return next;
      }
      return { ...prev, [matchId]: teamId };
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const upserts = Object.entries(picks).map(([match_id, winner_id]) => ({
      group_id: groupId,
      user_id: userId,
      match_id,
      winner_id,
      updated_at: new Date().toISOString(),
    }));
    if (upserts.length > 0) {
      const { error: dbError } = await supabase
        .from("knockout_picks")
        .upsert(upserts, { onConflict: "group_id,user_id,match_id" });
      if (dbError) { setError(dbError.message); setSaving(false); return; }
    }
    setSaving(false);
    setSaved(true);
  }

  const matchesByRound: Record<string, WcMatch[]> = {};
  for (const m of matches) {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  }

  const pickableMatches = matches.filter(
    (m) => m.status !== "finished" && m.home_team_id && m.away_team_id
  );
  const totalMatches = pickableMatches.length;
  const pickedCount = pickableMatches.filter((m) => picks[m.id]).length;

  if (matches.length === 0) {
    return (
      <div className={styles.noTeams}>
        <p>⚽ Knockout fixtures haven&apos;t been synced yet. The admin will enable this when the knockout stage begins.</p>
      </div>
    );
  }

  return (
    <>
      {isLocked && (
        <div className={styles.lockedBanner}>
          🔒 Knockout predictions are closed. Your picks are saved below.
        </div>
      )}

      <div className={styles.progress}>
        <span>{pickedCount}/{totalMatches} matches</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${totalMatches > 0 ? (pickedCount / totalMatches) * 100 : 0}%` }} />
        </div>
        <span>{pickedCount === totalMatches && totalMatches > 0 ? "All picked! 🎉" : `${totalMatches - pickedCount} remaining`}</span>
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
                    {isFinished && match.home_score !== null && (
                      <span className={styles.koScore}> · {match.home_score}–{match.away_score}</span>
                    )}
                  </div>
                  <div className={styles.koTeams}>
                    <button
                      type="button"
                      className={[
                        styles.koTeamBtn,
                        pickedId === match.home_team_id ? styles.koTeamBtnPicked : "",
                        actualWinner === match.home_team_id ? styles.koTeamBtnWon : actualWinner ? styles.koTeamBtnLost : "",
                        isLocked || !match.home_team_id || isFinished ? styles.koTeamBtnDisabled : "",
                      ].join(" ")}
                      onClick={() => match.home_team_id && pickWinner(match.id, match.home_team_id)}
                      disabled={isLocked || !match.home_team_id || isFinished}
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
                    <span className={styles.koVs}>vs</span>
                    <button
                      type="button"
                      className={[
                        styles.koTeamBtn,
                        pickedId === match.away_team_id ? styles.koTeamBtnPicked : "",
                        actualWinner === match.away_team_id ? styles.koTeamBtnWon : actualWinner ? styles.koTeamBtnLost : "",
                        isLocked || !match.away_team_id || isFinished ? styles.koTeamBtnDisabled : "",
                      ].join(" ")}
                      onClick={() => match.away_team_id && pickWinner(match.id, match.away_team_id)}
                      disabled={isLocked || !match.away_team_id || isFinished}
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
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className={styles.errorMsg}>{error}</p>}

      {!isLocked && (
        <div className={styles.saveBar}>
          <span className={styles.saveStatus}>
            {saved ? "All changes saved" : pickedCount > 0 ? "Unsaved changes" : "Pick match winners"}
          </span>
          <button
            className={styles.saveBtn}
            onClick={save}
            disabled={saving || pickedCount === 0 || saved}
          >
            {saving ? "Saving…" : "Save picks"}
          </button>
        </div>
      )}
    </>
  );
}
