"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Oval } from "react-loader-spinner";
import styles from "./FeedbackWidget.module.css";

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, page: pathname }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setMessage("");
      setTimeout(() => { setStatus("idle"); setOpen(false); }, 2500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.widget}>
      {open ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>💬 Leave feedback</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>
          {status === "sent" ? (
            <p className={styles.sentMsg}>Thanks for the feedback! 🙏</p>
          ) : (
            <form onSubmit={submit}>
              <textarea
                className={styles.textarea}
                placeholder="What's working well? What could be better?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                required
              />
              {status === "error" && (
                <p className={styles.errorMsg}>Failed to send. Please try again.</p>
              )}
              <button type="submit" className={styles.sendBtn} disabled={status === "sending" || !message.trim()}>
                {status === "sending" ? <Oval height={16} width={16} color="currentColor" strokeWidth={5} /> : "Send feedback"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <button className={styles.trigger} onClick={() => setOpen(true)}>
          💬
        </button>
      )}
    </div>
  );
}
