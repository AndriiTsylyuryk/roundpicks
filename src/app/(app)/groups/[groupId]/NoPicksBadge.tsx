"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

export default function NoPicksBadge() {
  const [open, setOpen] = useState(false);
  const dotRef = useRef<HTMLButtonElement>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (open && dotRef.current) {
      const rect = dotRef.current.getBoundingClientRect();
      setTipPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
    }
  }, [open]);

  return (
    <span className={styles.noPicksWrap}>
      <span className={styles.noPicksBadgeTxt}>No picks made</span>
      <button
        ref={dotRef}
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
          {tipPos && (
            <span
              className={styles.noPicksTip}
              style={{ top: tipPos.top, left: tipPos.left }}
            >
              no picks made
            </span>
          )}
        </>
      )}
    </span>
  );
}
