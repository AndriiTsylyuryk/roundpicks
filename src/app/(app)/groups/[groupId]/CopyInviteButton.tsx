"use client";

import toast from "react-hot-toast";
import styles from "./page.module.css";

export default function CopyInviteButton({ url }: { url: string }) {
  async function copy() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { id: "copy-invite" });
  }

  return (
    <button onClick={copy} className={styles.copyBtn}>
      Invite a friend
    </button>
  );
}
