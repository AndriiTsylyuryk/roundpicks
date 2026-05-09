"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/team-flags";
import styles from "./page.module.css";

const WC_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

interface Group {
  id: string;
  name: string;
  phase1_locked: boolean;
  phase1_deadline: string | null;
  phase2_locked: boolean;
  phase2_deadline: string | null;
  phase3_locked: boolean;
  phase3_deadline: string | null;
  max_participants: number;
}

interface WCTeam {
  id: string;
  name: string;
  group_letter: string;
  is_best_third?: boolean;
}

interface GroupResult {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

export default function AdminControls({
  group,
  teamsLoaded,
  assignedCount,
  teams,
  groupResults,
}: {
  group: Group;
  teamsLoaded: number;
  assignedCount: number;
  teams: WCTeam[];
  groupResults: GroupResult[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deadline, setDeadline] = useState(
    group.phase1_deadline ? group.phase1_deadline.slice(0, 16) : ""
  );
  const [phase2Deadline, setPhase2Deadline] = useState(
    group.phase2_deadline ? group.phase2_deadline.slice(0, 16) : ""
  );
  const [phase3Deadline, setPhase3Deadline] = useState(
    group.phase3_deadline ? group.phase3_deadline.slice(0, 16) : ""
  );

  // Results state: wc_group → { rank1, rank2, rank3 }
  const initialResults = useMemo(() => {
    const map: Record<string, { rank1: string; rank2: string; rank3: string }> = {};
    for (const g of WC_GROUPS) {
      const existing = groupResults.find((r) => r.wc_group === g);
      map[g] = {
        rank1: existing?.rank1_id ?? "",
        rank2: existing?.rank2_id ?? "",
        rank3: existing?.rank3_id ?? "",
      };
    }
    return map;
  }, [groupResults]);

  const [results, setResults] = useState(initialResults);

  const initialBestThird = useMemo(
    () => new Set(teams.filter((t) => t.is_best_third).map((t) => t.id)),
    [teams]
  );
  const [selectedBestThird, setSelectedBestThird] = useState<Set<string>>(initialBestThird);

  function showMsg(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function setLocked(locked: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ phase1_locked: locked })
      .eq("id", group.id);
    setSaving(false);
    if (error) showMsg("error", error.message);
    else {
      showMsg("success", locked ? "Predictions locked." : "Predictions reopened.");
      router.refresh();
    }
  }

  async function saveDeadline() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ phase1_deadline: deadline ? new Date(deadline).toISOString() : null })
      .eq("id", group.id);
    setSaving(false);
    if (error) showMsg("error", error.message);
    else { showMsg("success", "Deadline saved."); router.refresh(); }
  }

  async function saveResults() {
    setSaving(true);
    const rows = WC_GROUPS.map((g) => ({
      wc_group: g,
      rank1_id: results[g].rank1 || null,
      rank2_id: results[g].rank2 || null,
      rank3_id: results[g].rank3 || null,
    })).filter((r) => r.rank1_id || r.rank2_id || r.rank3_id);

    const res = await fetch("/api/admin/results/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betGroupId: group.id, results: rows }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMsg("error", body.error ?? "Failed to save results.");
    } else {
      showMsg("success", "Results saved.");
      router.refresh();
    }
  }

  async function saveBestThird() {
    if (selectedBestThird.size !== 8) return;
    setSaving(true);
    const res = await fetch("/api/admin/results/best-third", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betGroupId: group.id, teamIds: [...selectedBestThird] }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMsg("error", body.error ?? "Failed to save.");
    } else {
      showMsg("success", "Best 3rd teams saved.");
      router.refresh();
    }
  }

  function toggleBestThird(teamId: string) {
    setSelectedBestThird((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < 8) {
        next.add(teamId);
      }
      return next;
    });
  }

  function setRank(wcGroup: string, rank: "rank1" | "rank2" | "rank3", teamId: string) {
    setResults((prev) => {
      const current = { ...prev[wcGroup] };
      // If this team is already assigned to another rank in the same group, clear it
      if (teamId) {
        if (rank !== "rank1" && current.rank1 === teamId) current.rank1 = "";
        if (rank !== "rank2" && current.rank2 === teamId) current.rank2 = "";
        if (rank !== "rank3" && current.rank3 === teamId) current.rank3 = "";
      }
      current[rank] = teamId;
      return { ...prev, [wcGroup]: current };
    });
  }

  const teamsByGroup = useMemo(() => {
    const map: Record<string, WCTeam[]> = {};
    for (const t of teams) {
      if (!map[t.group_letter]) map[t.group_letter] = [];
      map[t.group_letter].push(t);
    }
    return map;
  }, [teams]);

  async function setPhase2Locked(locked: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ phase2_locked: locked })
      .eq("id", group.id);
    setSaving(false);
    if (error) showMsg("error", error.message);
    else {
      showMsg("success", locked ? "Knockout predictions locked." : "Knockout predictions reopened.");
      router.refresh();
    }
  }

  async function savePhase2Deadline() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ phase2_deadline: phase2Deadline ? new Date(phase2Deadline).toISOString() : null })
      .eq("id", group.id);
    setSaving(false);
    if (error) showMsg("error", error.message);
    else { showMsg("success", "Deadline saved."); router.refresh(); }
  }

  async function setPhase3Locked(locked: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ phase3_locked: locked })
      .eq("id", group.id);
    setSaving(false);
    if (error) showMsg("error", error.message);
    else {
      showMsg("success", locked ? "Finals picks locked." : "Finals picks reopened.");
      router.refresh();
    }
  }

  async function savePhase3Deadline() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ phase3_deadline: phase3Deadline ? new Date(phase3Deadline).toISOString() : null })
      .eq("id", group.id);
    setSaving(false);
    if (error) showMsg("error", error.message);
    else { showMsg("success", "Deadline saved."); router.refresh(); }
  }

  async function syncTeams() {
    setSaving(true);
    const res = await fetch("/api/matches/sync", { method: "POST" });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMsg("error", body.error ?? "Sync failed.");
    } else {
      showMsg("success", "Teams synced.");
      router.refresh();
    }
  }

  const thirdPlaceTeams = useMemo(() => {
    const teamById = new Map(teams.map((t) => [t.id, t]));
    return groupResults
      .filter((r) => r.rank3_id)
      .map((r) => teamById.get(r.rank3_id!))
      .filter((t): t is WCTeam => !!t)
      .sort((a, b) => a.group_letter.localeCompare(b.group_letter));
  }, [groupResults, teams]);

  const groupsReady = teamsLoaded === 48 && assignedCount === 48;
  const savedResultsCount = groupResults.filter(
    (r) => r.rank1_id && r.rank2_id && r.rank3_id
  ).length;

  return (
    <>
      {/* Team status */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⚽ WC 2026 Teams</h2>
        <div className={styles.row}>
          {groupsReady ? (
            <span className={`${styles.statusBadge} ${styles.open}`}>
              ✅ {teamsLoaded} teams · Groups A–L assigned
            </span>
          ) : teamsLoaded > 0 ? (
            <span className={`${styles.statusBadge} ${styles.locked}`}>
              ⚠️ {teamsLoaded} teams loaded · {assignedCount} assigned to groups
            </span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.locked}`}>
              ⚠️ No teams loaded
            </span>
          )}
          <button
            className={`${styles.actionBtn} ${groupsReady ? styles.syncBtnSecondary : styles.syncBtn}`}
            onClick={syncTeams}
            disabled={saving}
          >
            🔄 {groupsReady ? "Re-sync" : "Sync teams"}
          </button>
        </div>
      </div>

      {/* Phase 1 lock */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📋 Group Stage Predictions</h2>
        <div className={styles.row}>
          <div>
            <div className={styles.label}>Status</div>
            <span className={`${styles.statusBadge} ${group.phase1_locked ? styles.locked : styles.open}`}>
              {group.phase1_locked ? "🔒 Locked" : "✅ Open"}
            </span>
          </div>
          {group.phase1_locked ? (
            <button className={`${styles.actionBtn} ${styles.unlockBtn}`} onClick={() => setLocked(false)} disabled={saving}>
              Reopen predictions
            </button>
          ) : (
            <button className={`${styles.actionBtn} ${styles.lockBtn}`} onClick={() => setLocked(true)} disabled={saving}>
              Lock predictions
            </button>
          )}
        </div>

        <div style={{ marginTop: "1.25rem" }}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel} htmlFor="deadline">Prediction deadline (optional)</label>
            <input
              id="deadline"
              type="datetime-local"
              className={styles.input}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={saveDeadline} disabled={saving}>
            Save deadline
          </button>
        </div>
      </div>

      {/* Group Stage Results — enter after group stage ends */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          📊 Group Stage Results
          {savedResultsCount > 0 && (
            <span className={styles.resultsBadge}>{savedResultsCount}/12 groups entered</span>
          )}
        </h2>
        <p className={styles.resultsNote}>
          Enter the official 1st / 2nd / 3rd place teams after each WC group concludes. This unlocks scoring for all participants.
        </p>

        <div className={styles.resultsGrid}>
          {WC_GROUPS.map((g) => {
            const groupTeams = teamsByGroup[g] ?? [];
            const current = results[g];
            const isSaved = !!(groupResults.find((r) => r.wc_group === g)?.rank1_id);
            return (
              <div key={g} className={`${styles.resultsCard} ${isSaved ? styles.resultsCardSaved : ""}`}>
                <div className={styles.resultsCardHeader}>
                  <span className={styles.resultsGroupLabel}>Group {g}</span>
                  {isSaved && <span className={styles.resultsSavedDot}>✓</span>}
                </div>
                <div className={styles.resultsSelects}>
                  {(["rank1", "rank2", "rank3"] as const).map((rank, i) => (
                    <div key={rank} className={styles.resultsSelectRow}>
                      <span className={styles.resultsRankNum}>{i + 1}</span>
                      <select
                        className={styles.resultsSelect}
                        value={current[rank]}
                        onChange={(e) => setRank(g, rank, e.target.value)}
                        disabled={saving}
                      >
                        <option value="">— pick team —</option>
                        {groupTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {getFlag(t.name)} {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.resultsSaveRow}>
          <button
            className={`${styles.actionBtn} ${styles.saveBtn}`}
            onClick={saveResults}
            disabled={saving}
          >
            Save all results
          </button>
          {savedResultsCount === 12 && (
            <span className={styles.resultsAllDone}>✅ All groups entered — leaderboard live</span>
          )}
        </div>
      </div>

      {/* Best 3rd Teams (Official) — shown after all 12 group results saved */}
      {savedResultsCount === 12 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🥉 Official Best 3rd-Place Teams
            {selectedBestThird.size === 8 && initialBestThird.size === 8 && (
              <span className={styles.resultsBadge}>8/8 saved</span>
            )}
          </h2>
          <p className={styles.resultsNote}>
            Select the 8 third-place teams that officially advance to the Round of 32. Used to score participants&apos; Best 3rd picks.
          </p>

          <div className={styles.best3Counter}>
            <span className={`${styles.best3Count} ${selectedBestThird.size === 8 ? styles.best3CountDone : ""}`}>
              {selectedBestThird.size}/8 selected
            </span>
          </div>

          <div className={styles.best3Grid}>
            {thirdPlaceTeams.map((team) => {
              const isSelected = selectedBestThird.has(team.id);
              const isDisabled = saving || (!isSelected && selectedBestThird.size >= 8);
              return (
                <button
                  key={team.id}
                  type="button"
                  className={`${styles.best3Btn} ${isSelected ? styles.best3BtnSelected : ""} ${isDisabled ? styles.best3BtnDisabled : ""}`}
                  onClick={() => toggleBestThird(team.id)}
                  disabled={isDisabled}
                >
                  <span className={styles.best3Group}>Group {team.group_letter}</span>
                  <span className={styles.best3Flag}>{getFlag(team.name)}</span>
                  <span className={styles.best3Name}>{team.name}</span>
                  {isSelected && <span className={styles.best3Check}>✓</span>}
                </button>
              );
            })}
          </div>

          <div className={styles.resultsSaveRow} style={{ marginTop: "1.25rem" }}>
            <button
              className={`${styles.actionBtn} ${styles.saveBtn}`}
              onClick={saveBestThird}
              disabled={saving || selectedBestThird.size !== 8}
            >
              Save best 3rd teams
            </button>
            {selectedBestThird.size === 8 && initialBestThird.size === 8 && (
              <span className={styles.resultsAllDone}>✅ Saved — scoring unlocked</span>
            )}
          </div>
        </div>
      )}

      {/* Phase 2 — Knockout Predictions (shown after Phase 1 is locked) */}
      {group.phase1_locked && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🏆 Knockout Predictions (Phase 2)</h2>
          <div className={styles.row}>
            <div>
              <div className={styles.label}>Status</div>
              <span className={`${styles.statusBadge} ${group.phase2_locked ? styles.locked : styles.open}`}>
                {group.phase2_locked ? "🔒 Locked" : "✅ Open"}
              </span>
            </div>
            {group.phase2_locked ? (
              <button className={`${styles.actionBtn} ${styles.unlockBtn}`} onClick={() => setPhase2Locked(false)} disabled={saving}>
                Reopen predictions
              </button>
            ) : (
              <button className={`${styles.actionBtn} ${styles.lockBtn}`} onClick={() => setPhase2Locked(true)} disabled={saving}>
                Lock predictions
              </button>
            )}
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel} htmlFor="p2deadline">Deadline (optional)</label>
              <input
                id="p2deadline"
                type="datetime-local"
                className={styles.input}
                value={phase2Deadline}
                onChange={(e) => setPhase2Deadline(e.target.value)}
              />
            </div>
            <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={savePhase2Deadline} disabled={saving}>
              Save deadline
            </button>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button
              className={`${styles.actionBtn} ${styles.syncBtnSecondary}`}
              onClick={syncTeams}
              disabled={saving}
            >
              🔄 Sync knockout fixtures
            </button>
            <p className={styles.resultsNote} style={{ marginTop: "0.5rem" }}>
              Fetches the bracket from football-data.org and updates match scores.
            </p>
          </div>
        </div>
      )}

      {/* Phase 3 — Finals Picks (shown after Phase 2 is locked) */}
      {group.phase2_locked && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🥇 Finals Picks (Phase 3)</h2>
          <div className={styles.row}>
            <div>
              <div className={styles.label}>Status</div>
              <span className={`${styles.statusBadge} ${group.phase3_locked ? styles.locked : styles.open}`}>
                {group.phase3_locked ? "🔒 Locked" : "✅ Open"}
              </span>
            </div>
            {group.phase3_locked ? (
              <button className={`${styles.actionBtn} ${styles.unlockBtn}`} onClick={() => setPhase3Locked(false)} disabled={saving}>
                Reopen picks
              </button>
            ) : (
              <button className={`${styles.actionBtn} ${styles.lockBtn}`} onClick={() => setPhase3Locked(true)} disabled={saving}>
                Lock picks
              </button>
            )}
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel} htmlFor="p3deadline">Deadline (optional)</label>
              <input
                id="p3deadline"
                type="datetime-local"
                className={styles.input}
                value={phase3Deadline}
                onChange={(e) => setPhase3Deadline(e.target.value)}
              />
            </div>
            <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={savePhase3Deadline} disabled={saving}>
              Save deadline
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`${styles.msg} ${msg.type === "success" ? styles.success : styles.error}`}>
          {msg.text}
        </p>
      )}
    </>
  );
}
