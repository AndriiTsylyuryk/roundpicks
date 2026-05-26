"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagCode } from "@/lib/team-flags";
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

const ROUND_LABEL: Record<string, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  FINAL: "Final",
  "3RD": "3rd-place",
};

const DISPLAY_ID_PREFIX: Record<string, string> = {
  R32: "M",
  R16: "R16-",
  QF: "QF",
  SF: "SF",
  FINAL: "F",
  "3RD": "3rd",
};

const ROUND_MATCH_COUNT: Record<string, number> = {
  R32: 16,
  R16: 8,
  QF: 4,
  SF: 2,
  FINAL: 1,
  "3RD": 1,
};

type MatchSaveState = "idle" | "saving" | "saved" | "error";

function BracketMatchRow({
  match,
  teamById,
  picks,
  saveState,
  onPick,
  isMatchLocked,
  upstreamLabels,
  displayIds,
}: {
  match: WcMatch;
  teamById: Map<string, Team>;
  picks: Record<string, string>;
  saveState: Record<string, MatchSaveState>;
  onPick: (match: WcMatch, teamId: string) => void;
  isMatchLocked: (match: WcMatch) => boolean;
  upstreamLabels: Map<string, { home: string | null; away: string | null }>;
  displayIds: Map<string, string>;
}) {
  const upstream = upstreamLabels.get(match.id);
  const homeUpstream = upstream?.home ?? null;
  const awayUpstream = upstream?.away ?? null;
  const home = match.home_team_id ? teamById.get(match.home_team_id) ?? null : null;
  const away = match.away_team_id ? teamById.get(match.away_team_id) ?? null : null;
  const pickedId = picks[match.id];
  const isFinished = match.status === "finished";
  const locked = isMatchLocked(match);
  const ms = saveState[match.id] ?? "idle";
  const hasRealHome = !!(match.home_team_id && home);
  const hasRealAway = !!(match.away_team_id && away);
  const empty = !hasRealHome || !hasRealAway;

  const actualWinner =
    isFinished && match.home_score !== null && match.away_score !== null
      ? match.home_score > match.away_score
        ? match.home_team_id
        : match.away_score > match.home_score
        ? match.away_team_id
        : null
      : null;

  const renderTeam = (team: Team | null, teamId: string | null, upstreamLabel: string | null) => {
    const isWin = pickedId === teamId;
    const isLose = pickedId && !isWin;
    const isUpstream = !teamId && upstreamLabel !== null;
    const btnDisabled = locked || isUpstream || isFinished || !teamId;

    return (
      <button
        type="button"
        disabled={btnDisabled}
        className={[
          styles.bracketTeamBtn,
          isWin ? styles.bracketTeamBtnPicked : "",
          isLose ? styles.bracketTeamBtnNotPicked : "",
          actualWinner === teamId ? styles.bracketTeamBtnWon : "",
          actualWinner && actualWinner !== teamId && teamId ? styles.bracketTeamBtnLost : "",
          btnDisabled ? styles.bracketTeamBtnDisabled : "",
        ].filter(Boolean).join(" ")}
        onClick={() => teamId && onPick(match, teamId)}
      >
        {team ? (
          <>
            {(() => {
              const code = getFlagCode(team.name);
              if (!code) return <span className={styles.bracketFlagFallback}>?</span>;
              const cc = code.length > 2 ? code.slice(0, 2) : code;
              return <img className={styles.bracketFlag} src={`https://flagcdn.com/28x21/${cc}.png`} alt="" />;
            })()}
            <span className={[
              styles.bracketName,
              isWin ? styles.bracketNamePicked : "",
              isLose ? styles.bracketNameNotPicked : "",
            ].filter(Boolean).join(" ")}>
              {team.name}
            </span>
          </>
        ) : (
          <span className={styles.bracketTbd}>{upstreamLabel ?? "TBD"}</span>
        )}
        {isWin && (
          <span className={styles.bracketCheck}>✓</span>
        )}
      </button>
    );
  };

  return (
    <div className={styles.bracketMatchRow}>
      <div className={styles.bracketMatchMeta}>
        <span className={styles.bracketMatchId}>Match {displayIds.get(match.id) ?? match.id}</span>
        {ms === "saving" && <span className={styles.bracketSaving}>·</span>}
        {ms === "error" && <span className={styles.bracketError}>!</span>}
        <span className={styles.bracketMatchStatus}>
          {isFinished ? (
            match.home_score !== null ? `${match.home_score}–${match.away_score}` : "Finished"
          ) : pickedId ? (
            <span className={styles.bracketStatusSaved}>Pick saved</span>
          ) : locked ? (
            "Locked"
          ) : empty ? (
            ""
          ) : (
            "Tap a team"
          )}
        </span>
      </div>
      <div className={styles.bracketMatchTeams}>
        {renderTeam(home, match.home_team_id, homeUpstream)}
        <span className={styles.bracketVs}>vs</span>
        {renderTeam(away, match.away_team_id, awayUpstream)}
      </div>
      {isFinished && pickedId && actualWinner && (
        <div className={pickedId === actualWinner ? styles.bracketResultWon : styles.bracketResultLost}>
          {pickedId === actualWinner ? `+${ROUND_POINTS[match.round] ?? 0}` : "✗"}
        </div>
      )}
    </div>
  );
}

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

  const rounds = ROUND_ORDER.map((round) => {
    const dbMatches = matches.filter((m) => m.round === round);
    const expectedCount = ROUND_MATCH_COUNT[round] ?? 0;
    const count = Math.max(expectedCount, dbMatches.length);

    const roundMatches: WcMatch[] = [];
    for (let i = 0; i < count; i++) {
      if (i < dbMatches.length) {
        roundMatches.push(dbMatches[i]);
      } else {
        roundMatches.push({
          id: `placeholder-${round}-${i}`,
          round,
          kickoff_at: new Date(8640000000000000).toISOString(),
          home_team_id: null,
          away_team_id: null,
          status: "scheduled",
          home_score: null,
          away_score: null,
        });
      }
    }

    return { round, label: ROUND_LABEL[round] ?? round, matches: roundMatches };
  });

  // Build short display IDs (M1, R16-1, QF1, SF1, F) for all matches
  const displayIds = new Map<string, string>();
  for (const { round, matches: roundMatches } of rounds) {
    const prefix = DISPLAY_ID_PREFIX[round] ?? "";
    roundMatches.forEach((m, i) => {
      displayIds.set(m.id, `${prefix}${round === "R32" ? i + 1 : round === "R16" ? i + 1 : round === "FINAL" ? "" : i + 1}`);
    });
  }

  // Compute upstream winner labels for null team slots
  const upstreamLabels = new Map<string, { home: string | null; away: string | null }>();
  for (let r = 1; r < rounds.length; r++) {
    const prev = rounds[r - 1].matches;
    rounds[r].matches.forEach((m, i) => {
      const labels: { home: string | null; away: string | null } = { home: null, away: null };
      const prevHome = prev[2 * i];
      const prevAway = prev[2 * i + 1];
      if (!m.home_team_id && prevHome) labels.home = `Winner ${displayIds.get(prevHome.id) ?? prevHome.id}`;
      if (!m.away_team_id && prevAway) labels.away = `Winner ${displayIds.get(prevAway.id) ?? prevAway.id}`;
      if (labels.home || labels.away) upstreamLabels.set(m.id, labels);
    });
  }

  const hasRealMatches = matches.length > 0;
  const openMatches = matches.filter((m) => !isMatchLocked(m) && m.home_team_id && m.away_team_id && m.status !== "finished");
  const pickedOpen = openMatches.filter((m) => picks[m.id]).length;
  const totalPicked = matches.filter((m) => picks[m.id]).length;
  const saveStates = Object.values(saveState);
  const hasErrors = saveStates.some((s) => s === "error");
  const isSaving = saveStates.some((s) => s === "saving");

  return (
    <>
      {hasRealMatches && (
        <div className={styles.progress}>
          <span>{pickedOpen}/{openMatches.length} open matches</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${openMatches.length > 0 ? (pickedOpen / openMatches.length) * 100 : 100}%` }} />
          </div>
          <span>{totalPicked} picks saved</span>
        </div>
      )}

      <div className={styles.bracket}>
        {rounds.map(({ round, label, matches: roundMatches }) => {
          const picked = roundMatches.filter((m) => picks[m.id]).length;
          const total = roundMatches.length;
          const accent = round === "FINAL";

          return (
            <div key={round} className={styles.bracketRound}>
              <header className={styles.bracketRoundHeader}>
                <div>
                  <div className={`eyebrow ${accent ? styles.bracketRoundLabelAccent : styles.bracketRoundLabel}`}>
                    {label}
                  </div>
                  <div className={styles.bracketRoundTitle}>
                    {total} {total === 1 ? "match" : "matches"}
                  </div>
                </div>
                <span className={picked === total ? styles.bracketRoundPillDone : styles.bracketRoundPill}>
                  {picked} / {total} picked
                </span>
              </header>
              <ul className={styles.bracketMatchList}>
                {roundMatches.map((match) => (
                  <li key={match.id}>
                    <BracketMatchRow
                      match={match}
                      teamById={teamById}
                      picks={picks}
                      saveState={saveState}
                      onPick={pickWinner}
                      isMatchLocked={isMatchLocked}
                      upstreamLabels={upstreamLabels}
                      displayIds={displayIds}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {hasRealMatches && (
        <div className={styles.saveBar}>
          <span className={styles.saveStatus}>
            {hasErrors
              ? "Some picks failed to save"
              : isSaving
                ? "Saving…"
                : totalPicked > 0
                  ? `${totalPicked} picks saved`
                  : "No picks yet"}
          </span>
          <div className={styles.saveBtns}>
            <button className={styles.saveBtn} disabled>
              Auto-saving
            </button>
          </div>
        </div>
      )}
    </>
  );
}
