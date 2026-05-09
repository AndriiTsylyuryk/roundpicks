"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/team-flags";
import BestThirdForm from "./BestThirdForm";
import styles from "./page.module.css";

interface Team {
  id: string;
  name: string;
  group_letter: string;
}

interface Pick {
  wc_group: string;
  rank1_id: string;
  rank2_id: string;
  rank3_id: string | null;
}

interface Props {
  groupId: string;
  userId: string;
  teams: Team[];
  existingPicks: Pick[];
  isLocked: boolean;
}

const WC_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const RANK_LABELS = ["①", "②", "③"];
const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];

// Per group: ordered array [rank1_id, rank2_id, rank3_id] — null means not picked
type GroupRanks = [string | null, string | null, string | null];

export default function PredictForm({ groupId, userId, teams, existingPicks, isLocked }: Props) {
  const initRanks = (): Record<string, GroupRanks> => {
    const m: Record<string, GroupRanks> = {};
    for (const g of WC_GROUPS) m[g] = [null, null, null];
    for (const p of existingPicks) {
      m[p.wc_group] = [p.rank1_id, p.rank2_id, p.rank3_id ?? null];
    }
    return m;
  };

  const [ranks, setRanks] = useState<Record<string, GroupRanks>>(initRanks);
  const [saving, setSaving] = useState(false);
  const [savedGroups, setSavedGroups] = useState<Set<string>>(
    new Set(existingPicks.map((p) => p.wc_group))
  );
  const [allSaved, setAllSaved] = useState(false);

  const teamsByGroup: Record<string, Team[]> = {};
  for (const g of WC_GROUPS) teamsByGroup[g] = [];
  for (const t of teams) {
    if (teamsByGroup[t.group_letter]) teamsByGroup[t.group_letter].push(t);
  }

  const allGroupsHaveTeams = WC_GROUPS.some((g) => teamsByGroup[g].length > 0);

  function tap(groupLetter: string, teamId: string) {
    if (isLocked) return;
    setRanks((prev) => {
      const cur: GroupRanks = [...prev[groupLetter]];
      const existingIdx = cur.indexOf(teamId);

      if (existingIdx !== -1) {
        // Already ranked — remove and shift remaining down
        cur[existingIdx] = null;
        // Compact: shift non-null values to fill the gap
        const filled = cur.filter((v): v is string => v !== null);
        return { ...prev, [groupLetter]: [filled[0] ?? null, filled[1] ?? null, filled[2] ?? null] };
      }

      // Not ranked yet — assign to first open slot
      const firstOpen = cur.indexOf(null);
      if (firstOpen === -1) return prev; // all 3 filled, ignore tap
      const next: GroupRanks = [...cur];
      next[firstOpen] = teamId;
      return { ...prev, [groupLetter]: next };
    });
  }

  const completedGroups = WC_GROUPS.filter(
    (g) => ranks[g][0] !== null && ranks[g][1] !== null && ranks[g][2] !== null
  );
  const progress = completedGroups.length;
  const allComplete = progress === 12;

  const hasUnsaved = completedGroups.some((g) => !savedGroups.has(g)) ||
    WC_GROUPS.some((g) => {
      const saved = existingPicks.find((p) => p.wc_group === g);
      if (!saved) return false;
      const r = ranks[g];
      return saved.rank1_id !== r[0] || saved.rank2_id !== r[1] || (saved.rank3_id ?? null) !== r[2];
    });

  async function save() {
    setSaving(true);
    const supabase = createClient();

    const upserts = completedGroups.map((g) => ({
      group_id: groupId,
      user_id: userId,
      wc_group: g,
      rank1_id: ranks[g][0]!,
      rank2_id: ranks[g][1]!,
      rank3_id: ranks[g][2]!,
      updated_at: new Date().toISOString(),
    }));

    if (upserts.length > 0) {
      await supabase.from("group_picks").upsert(upserts, { onConflict: "group_id,user_id,wc_group" });
    }

    setSavedGroups(new Set(completedGroups));
    setSaving(false);

    if (allComplete) setAllSaved(true);
  }

  if (!allGroupsHaveTeams) {
    return (
      <div className={styles.noTeams}>
        <p>⚽ The admin hasn&apos;t loaded the WC 2026 teams yet. Check back soon!</p>
      </div>
    );
  }

  // After all 12 groups saved → show Best 3rd step
  if (allSaved || (allComplete && savedGroups.size === 12)) {
    const thirdPlaceTeams = WC_GROUPS.map((g) => {
      const id = ranks[g][2];
      return teams.find((t) => t.id === id) ?? null;
    }).filter((t): t is Team => t !== null);

    return (
      <BestThirdForm
        groupId={groupId}
        userId={userId}
        thirdPlaceTeams={thirdPlaceTeams}
        isLocked={isLocked}
        onBack={() => setAllSaved(false)}
      />
    );
  }

  return (
    <>
      {isLocked && (
        <div className={styles.lockedBanner}>
          🔒 Predictions are closed. Your picks are saved below.
        </div>
      )}

      <div className={styles.stepHeader}>
        <span className={styles.stepBadge}>Step 1 of 2</span>
        <span className={styles.stepTitle}>Group Rankings</span>
      </div>

      <div className={styles.progress}>
        <span>{progress}/12 groups</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(progress / 12) * 100}%` }} />
        </div>
        <span>{progress === 12 ? "All ranked! 🎉" : `${12 - progress} remaining`}</span>
      </div>

      <div className={styles.groups}>
        {WC_GROUPS.map((g) => {
          const groupTeams = teamsByGroup[g];
          if (groupTeams.length === 0) return null;
          const groupRanks = ranks[g];
          const isSaved = savedGroups.has(g);
          const isComplete = groupRanks.every((r) => r !== null);

          return (
            <div key={g} className={`${styles.groupCard} ${isComplete ? styles.groupCardComplete : ""}`}>
              <div className={styles.groupCardHeader}>
                <span className={styles.groupLetter}>GROUP {g}</span>
                {isSaved && isComplete && <span className={styles.savedBadge}>✓ Saved</span>}
              </div>

              {/* Rank summary row */}
              <div className={styles.rankSummary}>
                {groupRanks.map((teamId, i) => {
                  const team = teams.find((t) => t.id === teamId);
                  return (
                    <div key={i} className={styles.rankSlot} style={{ borderColor: teamId ? RANK_COLORS[i] : undefined }}>
                      <span className={styles.rankNum} style={{ color: RANK_COLORS[i] }}>{RANK_LABELS[i]}</span>
                      {team ? (
                        <span className={styles.rankTeam}>{getFlag(team.name)} {team.name}</span>
                      ) : (
                        <span className={styles.rankEmpty}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Team tap list */}
              <div className={styles.teams}>
                {groupTeams.map((team) => {
                  const rankIdx = groupRanks.indexOf(team.id);
                  const isRanked = rankIdx !== -1;
                  const allFilled = groupRanks.every((r) => r !== null);
                  const isDisabled = isLocked || (!isRanked && allFilled);

                  return (
                    <button
                      key={team.id}
                      type="button"
                      className={`${styles.teamBtn} ${isRanked ? styles.teamBtnRanked : ""} ${isDisabled ? styles.teamBtnDisabled : ""}`}
                      onClick={() => tap(g, team.id)}
                      disabled={isDisabled}
                      style={isRanked ? { borderColor: RANK_COLORS[rankIdx], background: `${RANK_COLORS[rankIdx]}14` } : undefined}
                    >
                      <span className={styles.teamFlag}>{getFlag(team.name)}</span>
                      <span className={styles.teamName}>{team.name}</span>
                      {isRanked && (
                        <span className={styles.teamRankBadge} style={{ background: RANK_COLORS[rankIdx] }}>
                          {RANK_LABELS[rankIdx]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!isLocked && !isComplete && (
                <p className={styles.hint}>
                  Tap teams to rank them 1st → 2nd → 3rd
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!isLocked && (
        <div className={styles.saveBar}>
          <span className={styles.saveStatus}>
            {hasUnsaved ? "Unsaved changes" : "All changes saved"}
          </span>
          <div className={styles.saveBtns}>
            <button
              className={styles.saveBtn}
              onClick={save}
              disabled={saving || completedGroups.length === 0 || !hasUnsaved}
            >
              {saving ? "Saving…" : "Save predictions"}
            </button>
            {allComplete && !hasUnsaved && (
              <button
                className={`${styles.saveBtn} ${styles.nextBtn}`}
                onClick={() => setAllSaved(true)}
              >
                Next: Best 3rd →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
