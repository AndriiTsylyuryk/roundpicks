"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";

interface Props {
  groupId: string;
  initialName: string;
}

export default function GroupNameEditor({ groupId, initialName }: Props) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) { setEditing(false); return; }
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      setName(trimmed);
      setEditing(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <div className={styles.nameEditRow}>
        <input
          ref={inputRef}
          className={styles.nameInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={60}
          disabled={saving}
          autoFocus
        />
        <button className={styles.nameSaveBtn} onClick={save} disabled={saving || !draft.trim()}>
          {saving ? "…" : "Save"}
        </button>
        <button className={styles.nameCancelBtn} onClick={() => setEditing(false)} disabled={saving}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <h1 className={styles.groupName}>
      {name}
      <button className={styles.editPencil} onClick={startEdit} title="Rename group">
        ✏️
      </button>
    </h1>
  );
}
