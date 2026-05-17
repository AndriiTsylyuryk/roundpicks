"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

interface Group {
  id: string;
  name: string;
  phase1_locked: boolean;
  phase1_deadline: string | null;
  max_participants: number;
}

export default function AdminControls({
  group,
  firstGroupKickoff,
}: {
  group: Group;
  firstGroupKickoff: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showMsg(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function setPhase1Locked(locked: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ phase1_locked: locked })
      .eq("id", group.id);
    setSaving(false);
    if (error) showMsg("error", error.message);
    else {
      showMsg("success", locked ? "Phase 1 manually locked." : "Phase 1 manually reopened.");
      router.refresh();
    }
  }

  const phase1AutoDeadline = firstGroupKickoff
    ? new Date(firstGroupKickoff).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      })
    : null;

  const phase1AutoClosed = firstGroupKickoff ? new Date() >= new Date(firstGroupKickoff) : false;

  return (
    <>
      {/* Phase 1 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📋 Phase 1 — Group Stage Predictions</h2>

        <div className={styles.row}>
          <div>
            <div className={styles.label}>Status</div>
            <span className={`${styles.statusBadge} ${(group.phase1_locked || phase1AutoClosed) ? styles.locked : styles.open}`}>
              {group.phase1_locked
                ? "🔒 Manually locked"
                : phase1AutoClosed
                ? "🔒 Auto-closed (first match started)"
                : "✅ Open"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {group.phase1_locked ? (
              <button className={`${styles.actionBtn} ${styles.unlockBtn}`} onClick={() => setPhase1Locked(false)} disabled={saving}>
                Reopen (override)
              </button>
            ) : (
              <button className={`${styles.actionBtn} ${styles.lockBtn}`} onClick={() => setPhase1Locked(true)} disabled={saving}>
                Lock now (override)
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          {phase1AutoDeadline ? (
            <p className={styles.resultsNote}>
              Auto-closes at first group match kickoff: <strong>{phase1AutoDeadline}</strong>
            </p>
          ) : (
            <p className={styles.resultsNote}>
              Auto-deadline not set yet — fixtures not synced yet.
            </p>
          )}
        </div>
      </div>

      {/* Phase 2: Knockout Picks */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🏆 Phase 2 — Knockout Picks</h2>
        <p className={styles.resultsNote}>
          Voting for each match automatically closes at kickoff. Fixtures, scores, and group results sync automatically every 10 minutes.
        </p>
      </div>

      {msg && (
        <p className={`${styles.msg} ${msg.type === "success" ? styles.success : styles.error}`}>
          {msg.text}
        </p>
      )}
    </>
  );
}
