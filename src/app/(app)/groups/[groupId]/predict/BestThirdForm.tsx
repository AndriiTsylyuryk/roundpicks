"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getFlagCode } from "@/lib/team-flags";
import styles from "./page.module.css";

interface Team {
  id: string;
  name: string;
  group_letter: string;
}

interface Props {
  groupId: string;
  userId: string;
  thirdPlaceTeams: Team[];
  isLocked: boolean;
  existingSelectedIds: string[];
  officialBestThirdIds: string[];
  nextStepUrl?: string;
}

const REQUIRED = 8;

export default function BestThirdForm({
  groupId, userId, thirdPlaceTeams, isLocked,
  existingSelectedIds, officialBestThirdIds, nextStepUrl,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(existingSelectedIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasOfficialResults = officialBestThirdIds.length === 8;

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
    if (dbError) setError(dbError.message);
    else if (nextStepUrl) router.push(nextStepUrl);
  }

  const count = selected.size;
  const isComplete = count === REQUIRED;

  const correctCount = hasOfficialResults
    ? [...selected].filter((id) => officialBestThirdIds.includes(id)).length
    : null;
  const bestThirdScore = correctCount !== null ? correctCount * 2 : null;

  return (
    <>
      <p className={styles.stepDesc}>
        Select <strong>8 teams</strong> you think will finish 3rd in their group and qualify for the Round of 32.
      </p>

      <div className={styles.thirdCounter}>
        <span className={`${styles.thirdCount} ${isComplete ? styles.thirdCountDone : ""}`}>
          {count}/{REQUIRED} selected
        </span>
        <div className={styles.thirdBar}>
          <div className={styles.thirdBarFill} style={{ width: `${(count / REQUIRED) * 100}%` }} />
        </div>
        {hasOfficialResults && isComplete && (
          <span className={styles.thirdScoreTag}>{correctCount}/8 correct · +{bestThirdScore} pts</span>
        )}
      </div>

      {isLocked && <div className={styles.lockedBanner}>🔒 Predictions are closed.</div>}

      <div className={styles.thirdGrid}>
        {thirdPlaceTeams.map((team) => {
          const isSelected = selected.has(team.id);
          const isDisabled = isLocked || (!isSelected && count >= REQUIRED);
          const isCorrect = hasOfficialResults && officialBestThirdIds.includes(team.id);
          const isWrong = hasOfficialResults && isSelected && !isCorrect;

          return (
            <button
              key={team.id}
              type="button"
              className={[
                styles.thirdBtn,
                isSelected ? styles.thirdBtnSelected : "",
                isDisabled ? styles.thirdBtnDisabled : "",
                isCorrect && isSelected ? styles.thirdBtnCorrect : "",
                isWrong ? styles.thirdBtnWrong : "",
              ].join(" ")}
              onClick={() => toggle(team.id)}
              disabled={isDisabled}
            >
              <span className={styles.thirdGroupTag}>Group {team.group_letter}</span>
              <span className={styles.thirdFlag}>
                {(() => {
                  const c = getFlagCode(team.name);
                  if (!c) return "⚽";
                  return <img className={styles.flagImg} src={`https://flagcdn.com/28x21/${c}.png`} alt="" />;
                })()}
              </span>
              <span className={styles.thirdName}>{team.name}</span>
              {isSelected && hasOfficialResults && (
                <span className={isCorrect ? styles.thirdResultCorrect : styles.thirdResultWrong}>
                  {isCorrect ? "+2" : "✗"}
                </span>
              )}
              {!isSelected && hasOfficialResults && isCorrect && (
                <span className={styles.thirdResultMissed}>missed</span>
              )}
              {isSelected && !hasOfficialResults && <span className={styles.thirdCheck}>✓</span>}
            </button>
          );
        })}
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {!isLocked && (
        <div className={styles.saveBar}>
          <span className={styles.saveStatus}>
            {error ? error : ""}
          </span>
          <div className={styles.saveBtns}>
            <button
              className={styles.saveBtn}
              onClick={save}
              disabled={saving || !isComplete}
            >
              {saving ? "Saving…" : "Save picks"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
