"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagCode } from "@/lib/team-flags";
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

interface GroupResult {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

interface Props {
  groupId: string;
  userId: string;
  teams: Team[];
  existingPicks: Pick[];
  isLocked: boolean;
  groupResults: GroupResult[];
  existingBestThirdIds: string[];
  officialBestThirdIds: string[];
}

const WC_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const RANK_LABELS = ["①", "②"];
const RANK_COLORS = ["#f59e0b", "#94a3b8"];

type GroupRanks = [string | null, string | null];

function calcRankPoints(
  predicted: GroupRanks,
  result: GroupResult | undefined
): (number | null)[] {
  if (!result?.rank1_id) return [null, null];
  const officialTop2 = [result.rank1_id, result.rank2_id];
  return predicted.map((teamId, idx) => {
    if (!teamId) return null;
    const officialIdx = officialTop2.indexOf(teamId);
    if (officialIdx === -1) return 0;
    return officialIdx === idx ? 2 : 1;
  });
}

export default function PredictForm({
  groupId, userId, teams, existingPicks, isLocked,
  groupResults, existingBestThirdIds, officialBestThirdIds,
}: Props) {
  const initRanks = (): Record<string, GroupRanks> => {
    const m: Record<string, GroupRanks> = {};
    for (const g of WC_GROUPS) m[g] = [null, null];
    for (const p of existingPicks) {
      m[p.wc_group] = [p.rank1_id, p.rank2_id];
    }
    return m;
  };

  const [ranks, setRanks] = useState<Record<string, GroupRanks>>(initRanks);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedGroups, setSavedGroups] = useState<Set<string>>(
    new Set(existingPicks.map((p) => p.wc_group))
  );
  const [step, setStep] = useState<1 | 2>(existingBestThirdIds.length > 0 ? 2 : 1);
  const [bestThirdEditMode, setBestThirdEditMode] = useState(false);

  const resultByGroup = new Map(groupResults.map((r) => [r.wc_group, r]));

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
        cur[existingIdx] = null;
        const filled = cur.filter((v): v is string => v !== null);
        return { ...prev, [groupLetter]: [filled[0] ?? null, filled[1] ?? null] };
      }
      const firstOpen = cur.indexOf(null);
      if (firstOpen === -1) return prev;
      const next: GroupRanks = [...cur];
      next[firstOpen] = teamId;
      return { ...prev, [groupLetter]: next };
    });
  }

  const completedGroups = WC_GROUPS.filter(
    (g) => ranks[g][0] !== null && ranks[g][1] !== null
  );
  const progress = completedGroups.length;
  const allComplete = progress === 12;

  const groupsToDelete = WC_GROUPS.filter(
    (g) => savedGroups.has(g) && !completedGroups.includes(g)
  );

  const hasUnsaved = completedGroups.some((g) => !savedGroups.has(g)) ||
    WC_GROUPS.some((g) => {
      const saved = existingPicks.find((p) => p.wc_group === g);
      if (!saved) return false;
      const r = ranks[g];
      return saved.rank1_id !== r[0] || saved.rank2_id !== r[1];
    }) ||
    groupsToDelete.length > 0;

  async function save() {
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const upserts = completedGroups.map((g) => ({
      group_id: groupId,
      user_id: userId,
      wc_group: g,
      rank1_id: ranks[g][0]!,
      rank2_id: ranks[g][1]!,
      rank3_id: null,
      updated_at: new Date().toISOString(),
    }));

    const errors: string[] = [];

    if (upserts.length > 0) {
      const { error } = await supabase.from("group_picks").upsert(upserts, { onConflict: "group_id,user_id,wc_group" });
      if (error) errors.push(error.message);
    }
    await Promise.all(groupsToDelete.map(async (g) => {
      const { error } = await supabase.from("group_picks")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .eq("wc_group", g);
      if (error) errors.push(error.message);
    }));

    if (errors.length > 0) {
      setSaveError("Save failed. Please try again.");
      setSaving(false);
      return;
    }

    setSavedGroups(new Set(completedGroups));
    setSaving(false);
    if (allComplete) { setBestThirdEditMode(existingBestThirdIds.length > 0); setStep(2); }
  }

  if (!allGroupsHaveTeams) {
    return (
      <div className={styles.noTeams}>
        <p>⚽ The admin hasn&apos;t loaded the WC 2026 teams yet. Check back soon!</p>
      </div>
    );
  }

  if (step === 2) {
    const thirdPlaceTeams = WC_GROUPS.flatMap((g) => {
      const picked = new Set([ranks[g][0], ranks[g][1]].filter(Boolean));
      return teamsByGroup[g].filter((t) => !picked.has(t.id));
    });

    return (
      <BestThirdForm
        groupId={groupId}
        userId={userId}
        thirdPlaceTeams={thirdPlaceTeams}
        isLocked={isLocked}
        onBack={() => { setStep(1); setBestThirdEditMode(false); }}
        editMode={bestThirdEditMode}
        existingSelectedIds={existingBestThirdIds}
        officialBestThirdIds={officialBestThirdIds}
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
          const result = resultByGroup.get(g);
          const rankPoints = calcRankPoints(groupRanks, result);
          const groupPts = result?.rank1_id
            ? rankPoints.reduce<number>((sum, p) => sum + (p ?? 0), 0)
            : null;

          return (
            <div key={g} className={`${styles.groupCard} ${isComplete ? styles.groupCardComplete : ""}`}>
              <div className={styles.groupCardHeader}>
                <span className={styles.groupLetter}>GROUP {g}</span>
                <div className={styles.groupCardHeaderRight}>
                  {groupPts !== null && (
                    <span className={`${styles.groupScoreBadge} ${groupPts > 0 ? styles.groupScoreBadgePos : styles.groupScoreBadgeZero}`}>
                      {groupPts > 0 ? `+${groupPts}` : "0"} pts
                    </span>
                  )}
                  {isSaved && isComplete && <span className={styles.savedBadge}>✓ Saved</span>}
                </div>
              </div>

              <div className={styles.rankSummary}>
                {groupRanks.map((teamId, i) => {
                  const team = teams.find((t) => t.id === teamId);
                  const pts = rankPoints[i];
                  const canRemove = !isLocked && !!team;
                  return (
                    <div
                      key={i}
                      role={canRemove ? "button" : undefined}
                      tabIndex={canRemove ? 0 : undefined}
                      className={`${styles.rankSlot} ${canRemove ? styles.rankSlotRemovable : ""}`}
                      style={{ borderColor: teamId ? RANK_COLORS[i] : undefined }}
                      onClick={canRemove ? () => tap(g, team.id) : undefined}
                      onKeyDown={canRemove ? (e) => { if (e.key === "Enter" || e.key === " ") tap(g, team.id); } : undefined}
                    >
                      <span className={styles.rankNum} style={{ color: RANK_COLORS[i] }}>{RANK_LABELS[i]}</span>
                      {team ? (
                        <span className={styles.rankTeam}>
                          {(() => {
                            const c = getFlagCode(team.name);
                            if (!c) return "⚽";
                            return <img className={styles.rankFlag} src={`https://flagcdn.com/28x21/${c.length > 2 ? c.slice(0, 2) : c}.png`} alt="" />;
                          })()} {team.name}
                        </span>
                      ) : (
                        <span className={styles.rankEmpty}>—</span>
                      )}
                      {canRemove && <span className={styles.rankRemoveHint}>×</span>}
                      {pts !== null && (
                        <span className={`${styles.rankPts} ${pts > 0 ? styles.rankPtsGood : styles.rankPtsBad}`}>
                          {pts > 0 ? `+${pts}` : "✗"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={styles.teams}>
                {groupTeams.filter((t) => !groupRanks.includes(t.id)).map((team) => {
                  const allFilled = groupRanks.every((r) => r !== null);
                  const isDisabled = isLocked || allFilled;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      className={`${styles.teamBtn} ${isDisabled ? styles.teamBtnDisabled : ""}`}
                      onClick={() => tap(g, team.id)}
                      disabled={isDisabled}
                    >
                      <span className={styles.teamFlag}>
                        {(() => {
                          const c = getFlagCode(team.name);
                          if (!c) return "⚽";
                          return <img className={styles.flagImg} src={`https://flagcdn.com/28x21/${c.length > 2 ? c.slice(0, 2) : c}.png`} alt="" />;
                        })()}
                      </span>
                      <span className={styles.teamName}>{team.name}</span>
                    </button>
                  );
                })}
              </div>

              {!isLocked && !isComplete && (
                <p className={styles.hint}>Tap teams to rank them 1st → 2nd</p>
              )}
            </div>
          );
        })}
      </div>

      {!isLocked && (
        <div className={styles.saveBar}>
          <span className={styles.saveStatus}>
            {saveError ? saveError : hasUnsaved ? "Unsaved changes" : "All changes saved"}
          </span>
          <div className={styles.saveBtns}>
            <button
              className={styles.saveBtn}
              onClick={save}
              disabled={saving || !hasUnsaved}
            >
              {saving ? "Saving…" : "Save predictions"}
            </button>
            {allComplete && !hasUnsaved && (
              <button className={`${styles.saveBtn} ${styles.nextBtn}`} onClick={() => { setBestThirdEditMode(existingBestThirdIds.length > 0); setStep(2); }}>
                Next: Best 3rd →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
