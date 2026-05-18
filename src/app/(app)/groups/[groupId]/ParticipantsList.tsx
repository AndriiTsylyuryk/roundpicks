"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface Props {
  names: string[];
}

export default function ParticipantsList({ names }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className={styles.participantsWrap}>
      <button
        className={styles.participantsBtn}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        👥 {names.length} participant{names.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 19 }} onClick={() => setOpen(false)} />
          <span className={styles.participantsPopover}>
            {names.map((name) => (
              <span key={name} className={styles.participantItem}>{name}</span>
            ))}
          </span>
        </>
      )}
    </span>
  );
}
