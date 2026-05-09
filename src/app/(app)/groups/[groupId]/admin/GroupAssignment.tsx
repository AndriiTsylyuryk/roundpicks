"use client";

import { useState } from "react";
import { getFlag } from "@/lib/team-flags";
import styles from "./page.module.css";

const WC_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

interface Team {
  id: string;
  name: string;
  group_letter: string;
}

export default function GroupAssignment({ teams }: { teams: Team[] }) {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    Object.fromEntries(teams.map((t) => [t.id, t.group_letter]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const groupCounts = WC_GROUPS.reduce(
    (acc, g) => {
      acc[g] = Object.values(assignments).filter((v) => v === g).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const unassignedCount = Object.values(assignments).filter(
    (v) => !WC_GROUPS.includes(v)
  ).length;

  const isComplete =
    unassignedCount === 0 && WC_GROUPS.every((g) => groupCounts[g] === 4);

  // Sort: assigned first (by group A–L), then unassigned alphabetically
  const sorted = [...teams].sort((a, b) => {
    const ga = assignments[a.id];
    const gb = assignments[b.id];
    const ai = WC_GROUPS.indexOf(ga);
    const bi = WC_GROUPS.indexOf(gb);
    if (ai !== bi) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.name.localeCompare(b.name);
  });

  async function save() {
    setSaving(true);
    const updates = teams.map((t) => ({ id: t.id, group_letter: assignments[t.id] }));
    const res = await fetch("/api/teams/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg({ type: "error", text: data.error ?? "Failed to save" });
    } else {
      setMsg({ type: "success", text: `Saved! ${data.updated} teams updated.` });
    }
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>🗂 Group Assignments</h2>

      <div className={styles.groupSummary}>
        {WC_GROUPS.map((g) => (
          <span
            key={g}
            className={`${styles.groupBadge} ${
              groupCounts[g] === 4
                ? styles.groupComplete
                : groupCounts[g] > 0
                ? styles.groupPartial
                : styles.groupEmpty
            }`}
          >
            {g}: {groupCounts[g]}/4
          </span>
        ))}
      </div>

      {unassignedCount > 0 && (
        <p className={styles.unassignedNote}>
          {unassignedCount} team{unassignedCount !== 1 ? "s" : ""} not yet assigned
        </p>
      )}

      <div className={styles.teamAssignList}>
        {sorted.map((t) => (
          <div key={t.id} className={styles.teamAssignRow}>
            <span className={styles.teamAssignName}>
              <span>{getFlag(t.name)}</span>
              <span>{t.name}</span>
            </span>
            <select
              className={styles.groupSelect}
              value={assignments[t.id]}
              onChange={(e) =>
                setAssignments((a) => ({ ...a, [t.id]: e.target.value }))
              }
            >
              <option value="?">—</option>
              {WC_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className={styles.assignSaveRow}>
        <button
          className={`${styles.actionBtn} ${styles.saveBtn}`}
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save assignments"}
        </button>
        {isComplete && (
          <span className={styles.completeNote}>✓ All 12 groups complete</span>
        )}
      </div>

      {msg && (
        <p className={`${styles.msg} ${msg.type === "success" ? styles.success : styles.error}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
