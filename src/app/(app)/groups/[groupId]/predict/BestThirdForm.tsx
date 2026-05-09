"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/team-flags";
import styles from "./page.module.css";

interface Team {
  id: string;
  name: string;
  group_letter: string;
}

interface Props {
  groupId: string;
  userId: string;
  thirdPlaceTeams: Team[]; // the 12 teams user ranked 3rd (one per WC group)
  isLocked: boolean;
  onBack: () => void;
}

const REQUIRED = 8;

export default function BestThirdForm({ groupId, userId, thirdPlaceTeams, isLocked, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function toggle(teamId: string) {
    if (isLocked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < REQUIRED) {
        next.add(teamId);
      }
      return next;
    });
    setSaved(false);
  }

  async function save() {
    if (selected.size !== REQUIRED) return;
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: dbError } = await supabase.from("best_third_picks").upsert(
      { group_id: groupId, user_id: userId, team_ids: [...selected], updated_at: new Date().toISOString() },
      { onConflict: "group_id,user_id" }
    );

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
    } else {
      setSaved(true);
    }
  }

  const count = selected.size;
  const isComplete = count === REQUIRED;

  return (
    <>
      <div className={styles.stepHeader}>
        <span className={styles.stepBadge}>Step 2 of 2</span>
        <span className={styles.stepTitle}>Best 3rd-Place Teams</span>
      </div>

      <p className={styles.stepDesc}>
        Select <strong>8 teams</strong> from the 12 group third-place finishers that you think will qualify for the Round of 32.
      </p>

      <div className={styles.thirdCounter}>
        <span className={`${styles.thirdCount} ${isComplete ? styles.thirdCountDone : ""}`}>
          {count}/{REQUIRED} selected
        </span>
        <div className={styles.thirdBar}>
          <div className={styles.thirdBarFill} style={{ width: `${(count / REQUIRED) * 100}%` }} />
        </div>
      </div>

      {isLocked && (
        <div className={styles.lockedBanner}>🔒 Predictions are closed.</div>
      )}

      <div className={styles.thirdGrid}>
        {thirdPlaceTeams.map((team) => {
          const isSelected = selected.has(team.id);
          const isDisabled = isLocked || (!isSelected && count >= REQUIRED);
          return (
            <button
              key={team.id}
              type="button"
              className={`${styles.thirdBtn} ${isSelected ? styles.thirdBtnSelected : ""} ${isDisabled ? styles.thirdBtnDisabled : ""}`}
              onClick={() => toggle(team.id)}
              disabled={isDisabled}
            >
              <span className={styles.thirdGroupTag}>Group {team.group_letter}</span>
              <span className={styles.thirdFlag}>{getFlag(team.name)}</span>
              <span className={styles.thirdName}>{team.name}</span>
              {isSelected && <span className={styles.thirdCheck}>✓</span>}
            </button>
          );
        })}
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {!isLocked && (
        <div className={styles.saveBar}>
          <button className={styles.backBtn} onClick={onBack} disabled={saving}>
            ← Back
          </button>
          <div className={styles.saveBtns}>
            {saved && <span className={styles.saveStatus}>Saved ✓</span>}
            <button
              className={styles.saveBtn}
              onClick={save}
              disabled={saving || !isComplete || saved}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save picks"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
