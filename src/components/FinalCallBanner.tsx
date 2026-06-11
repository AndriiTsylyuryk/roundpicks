"use client";

import { useEffect, useState } from "react";
import styles from "./FinalCallBanner.module.css";

const STORAGE_KEY = "rp-final-call-dismissed";

export function FinalCallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = globalThis.localStorage.getItem(STORAGE_KEY) === "true";
    if (!dismissed) setVisible(true);
  }, []);

  function handleDismiss() {
    setVisible(false);
    globalThis.localStorage.setItem(STORAGE_KEY, "true");
  }

  if (!visible) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <span aria-hidden className={styles.accent} />
        <span aria-hidden className={styles.iconWrap}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle
              cx="8"
              cy="8"
              r="6.4"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M8 4.4V8l2.4 1.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className={styles.content}>
          <div className={styles.title}>
            Final call — the World Cup starts today!
          </div>
          <div className={styles.sub}>
            Group-stage predictions lock today, June 11th, before the opening
            whistle. Lock in your picks, share your invite links, or set up any
            last-minute groups for family and friends right now.
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className={styles.dismissBtn}
        >
          ×
        </button>
      </div>
    </div>
  );
}
