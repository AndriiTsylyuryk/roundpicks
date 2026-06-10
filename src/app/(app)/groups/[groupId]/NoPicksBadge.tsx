"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function NoPicksBadge() {
  const [open, setOpen] = useState(false);

  return (
    <span className={styles.noPicksWrap}>
      <span className={styles.noPicksBadgeTxt}>No picks made</span>
      <button
        className={styles.noPicksDot}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label="No picks made"
      />
      {open && (
        <>
          <div
            className={styles.noPicksBackdrop}
            onClick={() => setOpen(false)}
          />
          <span className={styles.noPicksTip}>no picks made</span>
        </>
      )}
    </span>
  );
}
