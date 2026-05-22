"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDrawer } from "@/lib/drawer-context";
import styles from "./NavUserMenu.module.css";

interface Props {
  displayName: string;
}

type View = "menu" | "feedback" | "delete-confirm";

export default function UserMenuDrawer({ displayName }: Props) {
  const { close } = useDrawer();
  const [view, setView] = useState<View>("menu");
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error">("idle");
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    setDeleteStatus("deleting");
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleteStatus("error");
    }
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setFeedbackStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback, page: pathname }),
      });
      if (!res.ok) throw new Error();
      setFeedbackStatus("sent");
      setFeedback("");
      setTimeout(() => { setFeedbackStatus("idle"); close(); setView("menu"); }, 2500);
    } catch {
      setFeedbackStatus("error");
    }
  }

  return (
    <>
      <div className={styles.drawerAccent} />

      {view === "menu" && (
        <>
          <div className={styles.drawerHeader}>
            <span className={styles.drawerName}>{displayName}</span>
            <button className={styles.drawerClose} onClick={close}>✕</button>
          </div>
          <div className={styles.drawerDivider} />

          <div className={styles.sectionLabel}>Feedback</div>
          <button className={styles.drawerItem} onClick={() => setView("feedback")}>
            <span className={styles.drawerItemLabel}>Leave a feedback</span>
          </button>
          <a className={styles.drawerItem} href="#" target="_blank" rel="noreferrer">
            <span className={styles.drawerItemLabel}>Support the project</span>
          </a>

          <div className={styles.drawerDivider} />

          <div className={styles.sectionLabel}>Account</div>
          <button className={styles.drawerItem} onClick={signOut}>
            <span className={styles.drawerItemLabel}>Sign out</span>
          </button>
          <button
            className={`${styles.drawerItem} ${styles.drawerItemDanger}`}
            onClick={() => setView("delete-confirm")}
          >
            <span className={styles.drawerItemLabel}>Delete account</span>
          </button>
        </>
      )}

      {view === "feedback" && (
        <>
          <div className={styles.drawerHeader}>
            <button className={styles.drawerBack} onClick={() => setView("menu")}>←</button>
            <span className={styles.drawerTitle}>Leave a feedback</span>
          </div>
          {feedbackStatus === "sent" ? (
            <p className={styles.sentMsg}>Thanks for the feedback!</p>
          ) : (
            <form onSubmit={submitFeedback} className={styles.feedbackForm}>
              <textarea
                className={styles.textarea}
                placeholder="What's working well? What could be better?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                required
              />
              {feedbackStatus === "error" && (
                <p className={styles.errorMsg}>Failed to send. Please try again.</p>
              )}
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={feedbackStatus === "sending" || !feedback.trim()}
              >
                {feedbackStatus === "sending" ? "Sending…" : "Send"}
              </button>
            </form>
          )}
        </>
      )}

      {view === "delete-confirm" && (
        <>
          <div className={styles.drawerHeader}>
            <button className={styles.drawerBack} onClick={() => setView("menu")}>←</button>
            <span className={styles.drawerTitle}>Delete account</span>
          </div>
          <div className={styles.deleteIcon}>!</div>
          <p className={styles.deleteMsg}>
            This action is permanent — all your picks, groups, and data will be removed. This cannot be undone.
          </p>
          {deleteStatus === "error" && (
            <p className={styles.errorMsg} style={{ padding: "0 20px" }}>Something went wrong. Try again.</p>
          )}
          <div className={styles.deleteActions}>
            <button
              className={styles.deleteBtn}
              onClick={deleteAccount}
              disabled={deleteStatus === "deleting"}
            >
              {deleteStatus === "deleting" ? "Deleting…" : "Yes, delete my account"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
