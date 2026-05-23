"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function CopyInviteButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={copy} className={styles.copyBtn}>
      {copied ? "Share the link" : "Invite a friend"}
    </button>
  );
}
