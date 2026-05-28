"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import { Trash2 } from "lucide-react";

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
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showMsg(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function deleteGroup() {
    setDeleting(true);
    const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const { error } = await res.json();
      showMsg("error", error ?? "Failed to delete group");
      setDeleting(false);
      setConfirmDelete(false);
    }
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
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Phase 1 — Group Stage Predictions</h2>
        </div>
        <div className={styles.sectionBody}>
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
              ) : !phase1AutoClosed ? (
                <button className={`${styles.actionBtn} ${styles.lockBtn}`} onClick={() => setPhase1Locked(true)} disabled={saving}>
                  Lock now (override)
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.sectionNote}>
            {phase1AutoDeadline ? (
              <>Auto-closes at first group match kickoff: <strong>{phase1AutoDeadline}</strong></>
            ) : (
              "Auto-deadline not set yet — fixtures not synced yet."
            )}
          </div>
        </div>
      </div>

      {/* Phase 2: Knockout Picks */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Phase 2 — Knockout Picks</h2>
        </div>
        <div className={styles.sectionBody}>
          <p className={styles.resultsNote}>
            Voting for each match automatically closes at kickoff. Fixtures, scores, and group results sync automatically every 10 minutes.
          </p>
        </div>
      </div>

      {/* Danger zone */}
      <div className={styles.section} style={{ borderColor: "rgba(255,80,80,0.25)" }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ color: "#ff6b6b" }}>Danger Zone</h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.row}>
            <div>
              <div className={styles.label}>Delete group</div>
              <p className={styles.resultsNote} style={{ marginTop: 2 }}>
                Permanently removes the group and all picks. This cannot be undone.
              </p>
            </div>
            <div>
              {confirmDelete ? (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>Sure?</span>
                  <button
                    className={`${styles.actionBtn} ${styles.lockBtn}`}
                    style={{ background: "#c0392b" }}
                    onClick={deleteGroup}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.unlockBtn}`}
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className={`${styles.actionBtn} ${styles.lockBtn}`}
                  style={{ background: "#c0392b" }}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} /> Delete group
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <p className={`${styles.msg} ${msg.type === "success" ? styles.success : styles.error}`}>
          {msg.text}
        </p>
      )}
    </>
  );
}
