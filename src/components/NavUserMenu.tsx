"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./NavUserMenu.module.css";

interface Props {
  displayName: string;
}

type View = "menu" | "feedback" | "delete-confirm";

export default function NavUserMenu({ displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error">("idle");
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("menu");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = displayName.slice(0, 2).toUpperCase();

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
      setTimeout(() => { setFeedbackStatus("idle"); setOpen(false); setView("menu"); }, 2500);
    } catch {
      setFeedbackStatus("error");
    }
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.avatar}
        onClick={() => { setOpen((v) => !v); setView("menu"); }}
        aria-label="User menu"
      >
        {initials}
      </button>

      {open && (
        <div className={styles.popover}>
          {view === "menu" && (
            <>
              <div className={styles.popoverHeader}>
                <span className={styles.popoverName}>{displayName}</span>
              </div>
              <div className={styles.popoverDivider} />
              <button className={styles.popoverItem} onClick={() => setView("feedback")}>
                💬 Leave a feedback
              </button>
              <a className={styles.popoverItem} href="#" target="_blank" rel="noreferrer">
                ☕ Support the project
              </a>
              <div className={styles.popoverDivider} />
              <button className={styles.popoverItem} onClick={signOut}>
                Sign out
              </button>
              <button
                className={`${styles.popoverItem} ${styles.popoverItemDanger}`}
                onClick={() => setView("delete-confirm")}
              >
                Delete account
              </button>
            </>
          )}

          {view === "feedback" && (
            <>
              <div className={styles.popoverHeader}>
                <button className={styles.popoverBack} onClick={() => setView("menu")}>←</button>
                <span className={styles.popoverTitle}>Leave a feedback</span>
              </div>
              {feedbackStatus === "sent" ? (
                <p className={styles.sentMsg}>Thanks for the feedback! 🙏</p>
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
              <div className={styles.popoverHeader}>
                <button className={styles.popoverBack} onClick={() => setView("menu")}>←</button>
                <span className={styles.popoverTitle}>Delete account</span>
              </div>
              <p className={styles.deleteMsg}>
                This is permanent — all your picks and groups will be removed.
              </p>
              {deleteStatus === "error" && (
                <p className={styles.errorMsg} style={{ padding: "0 14px" }}>Something went wrong. Try again.</p>
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
        </div>
      )}
    </div>
  );
}
