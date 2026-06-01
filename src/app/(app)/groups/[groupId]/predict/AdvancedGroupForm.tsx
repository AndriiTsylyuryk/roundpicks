"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getFlagCode } from "@/lib/team-flags";
import styles from "./AdvancedGroupForm.module.css";
import pageStyles from "./page.module.css";

type MatchPrediction = "home" | "draw" | "away";

interface AdvancedMatch {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface TeamInfo {
  id: string;
  name: string;
  group_letter: string;
}

interface Props {
  groupId: string;
  userId: string;
  matches: AdvancedMatch[];
  teams: TeamInfo[];
  existingPicks: { match_id: string; prediction: MatchPrediction }[];
  isLocked: boolean;
  nextStepUrl?: string;
}

export default function AdvancedGroupForm({ groupId, userId, matches, teams, existingPicks, isLocked, nextStepUrl }: Props) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, MatchPrediction | null>>(() => {
    const init: Record<string, MatchPrediction | null> = {};
    for (const p of existingPicks) init[p.match_id] = p.prediction;
    return init;
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const now = useMemo(() => new Date(), []);

  const matchesByGroup = useMemo(() => {
    const map = new Map<string, AdvancedMatch[]>();
    for (const m of matches) {
      const t = teamsMap.get(m.home_team_id ?? "") ?? teamsMap.get(m.away_team_id ?? "");
      const letter = t?.group_letter;
      if (!letter) continue;
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches, teamsMap]);

  const total = useMemo(() => matches.filter((m) => m.home_team_id && m.away_team_id).length, [matches]);
  const picked = useMemo(() => Object.values(picks).filter((v) => v !== null).length, [picks]);
  const pct = total === 0 ? 0 : Math.round((picked / total) * 100);

  function handlePick(matchId: string, side: MatchPrediction) {
    if (isLocked) return;
    setPicks((prev) => ({ ...prev, [matchId]: prev[matchId] === side ? null : side }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const upsertData: { group_id: string; user_id: string; match_id: string; prediction: MatchPrediction }[] = Object.entries(picks)
      .filter((entry): entry is [string, MatchPrediction] => entry[1] !== null)
      .map(([match_id, prediction]) => ({ group_id: groupId, user_id: userId, match_id, prediction }));

    if (upsertData.length > 0) {
      const { error: err } = await supabase
        .from("match_predictions")
        .upsert(upsertData as never[], { onConflict: "group_id,user_id,match_id" });
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setDirty(false);
    setSaving(false);
  }

  return (
    <>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroOrb} aria-hidden />
        <div className={styles.heroBody}>
          <h2 className={styles.heroTitle}>{total} matches · pick a winner or draw.</h2>
          <p className={styles.heroSub}>
            Tap a team to pick its win, or tap Draw for a draw.
          </p>
          <div className={styles.heroProgress}>
            <div className={styles.heroProgressTrack}>
              <div className={styles.heroProgressFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.heroProgressLabel}>{picked} / {total} picked</span>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--color-error)", fontSize: 14, marginBottom: 12 }}>{error}</p>}

      {/* Groups grid */}
      <div className={styles.grid}>
        {matchesByGroup.map(([letter, groupMatches]) => {
          const groupPicked = groupMatches.filter((m) => picks[m.id] !== undefined && picks[m.id] !== null).length;
          const allDone = groupPicked === groupMatches.length;
          return (
            <div key={letter} className={styles.groupCard}>
              <header className={styles.groupHeader}>
                <span>Group {letter}</span>
                <span className={allDone ? styles.groupHeaderCountDone : styles.groupHeaderCount}>
                  {groupPicked} / {groupMatches.length} picked
                </span>
              </header>
              <ul className={styles.matchList}>
                {groupMatches.map((match) => {
                  const homeTeam = teamsMap.get(match.home_team_id ?? "");
                  const awayTeam = teamsMap.get(match.away_team_id ?? "");
                  const matchLocked = isLocked || now >= new Date(match.kickoff_at);
                  const pick = picks[match.id] ?? null;
                  return (
                    <li key={match.id}>
                      <div className={`${styles.matchRow} ${matchLocked ? styles.matchRowLocked : ""}`}>
                        <TeamButton
                          flagCode={homeTeam ? getFlagCode(homeTeam.name) : null}
                          name={homeTeam?.name ?? "TBD"}
                          active={pick === "home"}
                          disabled={matchLocked || !homeTeam}
                          onClick={() => handlePick(match.id, "home")}
                        />
                        <DrawButton
                          active={pick === "draw"}
                          disabled={matchLocked}
                          onClick={() => handlePick(match.id, "draw")}
                        />
                        <TeamButton
                          flagCode={awayTeam ? getFlagCode(awayTeam.name) : null}
                          name={awayTeam?.name ?? "TBD"}
                          active={pick === "away"}
                          disabled={matchLocked || !awayTeam}
                          onClick={() => handlePick(match.id, "away")}
                          alignRight
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Sticky save bar — only visible once all picks are made */}
      {!isLocked && picked === total && (
        <div className={pageStyles.saveBar}>
          <div className={styles.saveBarLeft}>
            {dirty ? (
              <span className={styles.unsaved}>
                <span className={styles.unsavedDot} aria-hidden />
                Unsaved changes
              </span>
            ) : (
              <span className={pageStyles.saveStatus}>Picks submitted ✓</span>
            )}
          </div>
          <div className={pageStyles.saveBtns}>
            {dirty && (
              <button className={pageStyles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save picks →"}
              </button>
            )}
            {!dirty && nextStepUrl && (
              <button className={`${pageStyles.saveBtn} ${pageStyles.nextBtn}`} onClick={() => router.push(nextStepUrl)}>
                Next: Group Rankings →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TeamButton({ flagCode, name, active, disabled, onClick, alignRight }: {
  flagCode: string | null; name: string; active: boolean; disabled: boolean; onClick: () => void; alignRight?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.teamBtn} ${active ? styles.teamBtnActive : ""}`}
      onClick={onClick}
      disabled={disabled}
      style={alignRight ? { flexDirection: "row-reverse" } : undefined}
    >
      <span className={styles.teamFlag}>
        {flagCode ? (
          <img
            src={`https://flagcdn.com/24x18/${flagCode}.png`}
            width={24}
            height={18}
            alt=""
            className={styles.teamFlagImg}
          />
        ) : (
          <span className={styles.teamFlagFallback}>?</span>
        )}
      </span>
      <span className={`${styles.teamName} ${active ? styles.teamNameActive : ""}`}>{name}</span>
      {active && <span className={styles.teamCheck} aria-hidden>✓</span>}
    </button>
  );
}

function DrawButton({ active, disabled, onClick }: { active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.drawBtn} ${active ? styles.drawBtnActive : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {active ? "✓ Draw" : "Draw"}
    </button>
  );
}
