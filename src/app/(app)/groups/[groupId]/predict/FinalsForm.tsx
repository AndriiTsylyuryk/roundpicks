"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/team-flags";
import styles from "./page.module.css";

interface Team {
  id: string;
  name: string;
}

interface FinalsPick {
  winner_id: string | null;
  runner_up_id: string | null;
  third_id: string | null;
}

interface Props {
  groupId: string;
  userId: string;
  teams: Team[];
  existingPick: FinalsPick | null;
  isLocked: boolean;
}

export default function FinalsForm({ groupId, userId, teams, existingPick, isLocked }: Props) {
  const [winner, setWinner] = useState(existingPick?.winner_id ?? "");
  const [runnerUp, setRunnerUp] = useState(existingPick?.runner_up_id ?? "");
  const [third, setThird] = useState(existingPick?.third_id ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  async function save() {
    if (!winner || !runnerUp || !third) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: dbError } = await supabase.from("finals_picks").upsert(
      {
        group_id: groupId,
        user_id: userId,
        winner_id: winner,
        runner_up_id: runnerUp,
        third_id: third,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id,user_id" }
    );
    setSaving(false);
    if (dbError) setError(dbError.message);
    else setSaved(true);
  }

  const isComplete = !!(winner && runnerUp && third);
  const hasConflict =
    (!!winner && winner === runnerUp) ||
    (!!winner && winner === third) ||
    (!!runnerUp && runnerUp === third);

  const slots = [
    { label: "🥇 Champion", value: winner, set: (v: string) => { setWinner(v); setSaved(false); } },
    { label: "🥈 Runner-up", value: runnerUp, set: (v: string) => { setRunnerUp(v); setSaved(false); } },
    { label: "🥉 3rd Place", value: third, set: (v: string) => { setThird(v); setSaved(false); } },
  ];

  return (
    <>
      {isLocked && (
        <div className={styles.lockedBanner}>
          🔒 Finals picks are closed. Your picks are saved below.
        </div>
      )}

      <p className={styles.stepDesc}>
        Predict the overall tournament champion, runner-up, and 3rd place finisher.
      </p>

      <div className={styles.finalsPodium}>
        {slots.map(({ label, value, set }) => {
          const selected = value ? teamById.get(value) : null;
          return (
            <div key={label} className={styles.finalsSlot}>
              <div className={styles.finalsSlotLabel}>{label}</div>
              {isLocked ? (
                <div className={styles.finalsPick}>
                  {selected ? `${getFlag(selected.name)} ${selected.name}` : "—"}
                </div>
              ) : (
                <select
                  className={styles.finalsSelect}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                >
                  <option value="">— pick team —</option>
                  {sortedTeams.map((t) => (
                    <option key={t.id} value={t.id}>{getFlag(t.name)} {t.name}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>

      {hasConflict && (
        <p className={styles.errorMsg}>Each position must be a different team.</p>
      )}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {!isLocked && (
        <div className={styles.saveBar}>
          <span className={styles.saveStatus}>
            {saved ? "All changes saved" : isComplete ? "Unsaved changes" : "Pick all 3 teams to save"}
          </span>
          <button
            className={styles.saveBtn}
            onClick={save}
            disabled={saving || !isComplete || hasConflict || saved}
          >
            {saving ? "Saving…" : "Save picks"}
          </button>
        </div>
      )}
    </>
  );
}
