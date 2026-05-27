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
  isKnockoutLocked: boolean;
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

interface UpstreamSlot {
  matchId: string | null;
  label: string | null;
}

function BracketMatchRow({
  match,
  teamById,
  picks,
  isLocked,
  onPick,
  upstreamSlots,
  displayIds,
  overrideTeams,
}: {
  match: WcMatch;
  teamById: Map<string, Team>;
  picks: Record<string, string>;
  isLocked: boolean;
  onPick: (match: WcMatch, teamId: string) => void;
  upstreamSlots: Map<string, { home: UpstreamSlot; away: UpstreamSlot }>;
  displayIds: Map<string, string>;
  overrideTeams?: { homeId: string | null; awayId: string | null } | null;
}) {
  const slots = upstreamSlots.get(match.id);

  const derivedHomeId =
    overrideTeams != null
      ? overrideTeams.homeId
      : slots?.home.matchId
        ? (picks[slots.home.matchId] ?? null)
        : null;
  const derivedAwayId =
    overrideTeams != null
      ? (overrideTeams.awayId ?? null)
      : slots?.away.matchId
        ? (picks[slots.away.matchId] ?? null)
        : null;

  const effectiveHomeId = match.home_team_id ?? derivedHomeId;
  const effectiveAwayId = match.away_team_id ?? derivedAwayId;
  const homeIsDerived = !match.home_team_id && !!derivedHomeId;
  const awayIsDerived = !match.away_team_id && !!derivedAwayId;

  const pickedId = picks[match.id];
  const isFinished = match.status === "finished";
  const empty = !effectiveHomeId || !effectiveAwayId;

  const actualWinner =
    isFinished && match.home_score !== null && match.away_score !== null
      ? match.home_score > match.away_score
        ? match.home_team_id
        : match.away_score > match.home_score
          ? match.away_team_id
          : null
      : null;

  const renderTeam = (
    teamId: string | null,
    isDerived: boolean,
    fallbackLabel: string | null,
  ) => {
    const team = teamId ? (teamById.get(teamId) ?? null) : null;
    const isWin = pickedId === teamId;
    const isLose = !!(pickedId && !isWin);
    const isUpstream = !teamId && fallbackLabel !== null;
    const btnDisabled = isLocked || isFinished || isUpstream || !teamId;

    return (
      <button
        type="button"
        disabled={btnDisabled}
        className={[
          styles.bracketTeamBtn,
          isWin ? styles.bracketTeamBtnPicked : "",
          isLose ? styles.bracketTeamBtnNotPicked : "",
          actualWinner === teamId ? styles.bracketTeamBtnWon : "",
          actualWinner && actualWinner !== teamId && teamId
            ? styles.bracketTeamBtnLost
            : "",
          btnDisabled ? styles.bracketTeamBtnDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => teamId && onPick(match, teamId)}
      >
        {team ? (
          <>
            {(() => {
              const code = getFlagCode(team.name);
              if (!code)
                return <span className={styles.bracketFlagFallback}>?</span>;
              const cc = code.length > 2 ? code.slice(0, 2) : code;
              return (
                <img
                  className={styles.bracketFlag}
                  src={`https://flagcdn.com/28x21/${cc}.png`}
                  alt=""
                />
              );
            })()}
            <span
              className={[
                styles.bracketName,
                isWin ? styles.bracketNamePicked : "",
                isLose ? styles.bracketNameNotPicked : "",
                isDerived && !isWin && !isLose ? styles.bracketNameDerived : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {team.name}
            </span>
          </>
        ) : (
          <span className={styles.bracketTbd}>{fallbackLabel ?? "TBD"}</span>
        )}
        {isWin && <span className={styles.bracketCheck}>✓</span>}
      </button>
    );
  };

  return (
    <div className={styles.bracketMatchRow}>
      <div className={styles.bracketMatchMeta}>
        <span className={styles.bracketMatchId}>
          Match {displayIds.get(match.id) ?? match.id}
        </span>
        <span className={styles.bracketMatchStatus}>
          {isFinished
            ? match.home_score !== null
              ? `${match.home_score}–${match.away_score}`
              : "Finished"
            : isLocked
              ? "Locked"
              : empty
                ? ""
                : !pickedId
                  ? "Tap a team"
                  : null}
        </span>
      </div>
      <div className={styles.bracketMatchTeams}>
        {renderTeam(effectiveHomeId, homeIsDerived, slots?.home.label ?? null)}
        <span className={styles.bracketVs}>vs</span>
        {renderTeam(effectiveAwayId, awayIsDerived, slots?.away.label ?? null)}
      </div>
      {isFinished && pickedId && actualWinner && (
        <div
          className={
            pickedId === actualWinner
              ? styles.bracketResultWon
              : styles.bracketResultLost
          }
        >
          {pickedId === actualWinner
            ? `+${ROUND_POINTS[match.round] ?? 0}`
            : "✗"}
        </div>
      )}
    </div>
  );
}

export default function KnockoutForm({
  groupId,
  userId,
  matches,
  teams,
  existingPicks,
  isKnockoutLocked,
}: Props) {
  const initialPicks = Object.fromEntries(
    existingPicks.map((p) => [p.match_id, p.winner_id]),
  );

  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [savedPicks, setSavedPicks] =
    useState<Record<string, string>>(initialPicks);
  const [isEditMode, setIsEditMode] = useState(existingPicks.length === 0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const teamById = new Map(teams.map((t) => [t.id, t]));

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

  const displayIds = new Map<string, string>();
  for (const { round, matches: roundMatches } of rounds) {
    const prefix = DISPLAY_ID_PREFIX[round] ?? "";
    roundMatches.forEach((m, i) => {
      displayIds.set(m.id, `${prefix}${round === "FINAL" ? "" : i + 1}`);
    });
  }

  // For each later-round match, track which upstream match feeds each slot.
  // 3RD is fed by SF losers — can't derive from winner picks, skip it.
  const upstreamSlots = new Map<
    string,
    { home: UpstreamSlot; away: UpstreamSlot }
  >();
  for (let r = 1; r < rounds.length; r++) {
    const { round, matches: curMatches } = rounds[r];
    if (round === "3RD") continue;
    const prev = rounds[r - 1].matches;
    curMatches.forEach((m, i) => {
      const prevHome = prev[2 * i];
      const prevAway = prev[2 * i + 1];
      upstreamSlots.set(m.id, {
        home: {
          matchId: !m.home_team_id && prevHome ? prevHome.id : null,
          label: !m.home_team_id && prevHome ? `Winner ${displayIds.get(prevHome.id) ?? prevHome.id}` : null,
        },
        away: {
          matchId: !m.away_team_id && prevAway ? prevAway.id : null,
          label: !m.away_team_id && prevAway ? `Winner ${displayIds.get(prevAway.id) ?? prevAway.id}` : null,
        },
      });
    });
  }

  // Derive 3RD place teams: SF losers (the team in each SF that the user did NOT pick)
  function getEffectiveTeams(match: WcMatch): {
    homeId: string | null;
    awayId: string | null;
  } {
    const slots = upstreamSlots.get(match.id);
    return {
      homeId:
        match.home_team_id ??
        (slots?.home.matchId ? (picks[slots.home.matchId] ?? null) : null),
      awayId:
        match.away_team_id ??
        (slots?.away.matchId ? (picks[slots.away.matchId] ?? null) : null),
    };
  }

  const sfMatches = rounds.find((r) => r.round === "SF")?.matches ?? [];
  const derived3rdTeams = (() => {
    const sf1 = sfMatches[0] ?? null;
    const sf2 = sfMatches[1] ?? null;
    const result = {
      homeId: null as string | null,
      awayId: null as string | null,
    };
    if (sf1) {
      const { homeId, awayId } = getEffectiveTeams(sf1);
      const winner = picks[sf1.id] ?? null;
      if (winner && homeId && awayId)
        result.homeId = winner === homeId ? awayId : homeId;
    }
    if (sf2) {
      const { homeId, awayId } = getEffectiveTeams(sf2);
      const winner = picks[sf2.id] ?? null;
      if (winner && homeId && awayId)
        result.awayId = winner === homeId ? awayId : homeId;
    }
    return result;
  })();

  function handlePick(match: WcMatch, teamId: string) {
    if (isKnockoutLocked || match.status === "finished") return;

    setPicks((prev) => {
      if (prev[match.id] === teamId) {
        const next = { ...prev };
        delete next[match.id];
        return next;
      }
      return { ...prev, [match.id]: teamId };
    });
  }

  async function saveAllPicks() {
    setIsSaving(true);
    setSaveError(null);
    const supabase = createClient();

    const toUpsert = Object.entries(picks).map(([match_id, winner_id]) => ({
      group_id: groupId,
      user_id: userId,
      match_id,
      winner_id,
      updated_at: new Date().toISOString(),
    }));

    const toDelete = Object.keys(savedPicks).filter((mid) => !picks[mid]);

    try {
      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from("knockout_picks")
          .upsert(toUpsert, { onConflict: "group_id,user_id,match_id" });
        if (error) throw error;
      }
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("knockout_picks")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .in("match_id", toDelete);
        if (error) throw error;
      }
      setSavedPicks({ ...picks });
      setIsEditMode(false);
    } catch {
      setSaveError("Failed to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasRealMatches = matches.length > 0;
  const totalPicked = Object.keys(picks).length;
  const hasUnsavedChanges =
    JSON.stringify(picks) !== JSON.stringify(savedPicks);

  return (
    <>
      {isKnockoutLocked && (
        <div className={styles.lockedBanner}>
          Knockout picks are locked — first match has started.
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
                  <div
                    className={`eyebrow ${accent ? styles.bracketRoundLabelAccent : styles.bracketRoundLabel}`}
                  >
                    {label}
                  </div>
                  <div className={styles.bracketRoundTitle}>
                    {total} {total === 1 ? "match" : "matches"}
                  </div>
                </div>
                <span
                  className={
                    picked === total
                      ? styles.bracketRoundPillDone
                      : styles.bracketRoundPill
                  }
                >
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
                      isLocked={isKnockoutLocked || !isEditMode}
                      onPick={handlePick}
                      upstreamSlots={upstreamSlots}
                      displayIds={displayIds}
                      overrideTeams={
                        match.round === "3RD" ? derived3rdTeams : null
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {hasRealMatches && !isKnockoutLocked && (
        <div className={styles.saveBar}>
          <span className={styles.saveStatus}>
            {saveError
              ? saveError
              : hasUnsavedChanges
                ? "Unsaved changes"
                : totalPicked > 0
                  ? `${totalPicked} picks saved`
                  : "No picks yet"}
          </span>
          <div className={styles.saveBtns}>
            {isEditMode ? (
              <button
                className={styles.saveBtn}
                onClick={saveAllPicks}
                disabled={isSaving || !hasUnsavedChanges}
              >
                {isSaving ? "Saving…" : "Save picks"}
              </button>
            ) : (
              <button
                className={styles.saveBtn}
                onClick={() => setIsEditMode(true)}
              >
                Edit picks
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
