"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Heart, LayoutDashboard, LifeBuoy, Info, LogOut, MessageSquare, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDrawer } from "@/lib/drawer-context";
import styles from "./NavUserMenu.module.css";

const PRESETS_EUR = [1, 3, 10];

function displayAmount(supportAmount: number, customAmount: string): string {
  if (customAmount) {
    const v = parseFloat(customAmount);
    return Number.isFinite(v) ? `€${v}` : "";
  }
  return `€${supportAmount}`;
}

interface Props {
  displayName: string;
}

type View = "menu" | "feedback" | "delete-confirm" | "support";

export default function UserMenuDrawer({ displayName }: Props) {
  const { close } = useDrawer();
  const [view, setView] = useState<View>("menu");
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [supportAmount, setSupportAmount] = useState<number>(3);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [supportError, setSupportError] = useState("");
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

          <div className={styles.sectionLabel}>Navigate</div>
          <Link href="/dashboard" className={styles.drawerItem} onClick={close}>
            <LayoutDashboard size={16} className={styles.drawerItemIcon} />
            <span className={styles.drawerItemLabel}>Dashboard</span>
          </Link>
          <Link href="/help" className={styles.drawerItem} onClick={close}>
            <LifeBuoy size={16} className={styles.drawerItemIcon} />
            <span className={styles.drawerItemLabel}>Help</span>
          </Link>
          <Link href="/about" className={styles.drawerItem} onClick={close}>
            <Info size={16} className={styles.drawerItemIcon} />
            <span className={styles.drawerItemLabel}>About</span>
          </Link>

          <div className={styles.drawerDivider} />

          <div className={styles.sectionLabel}>Feedback</div>
          <button className={styles.drawerItem} onClick={() => setView("feedback")}>
            <MessageSquare size={16} className={styles.drawerItemIcon} />
            <span className={styles.drawerItemLabel}>Leave a feedback</span>
          </button>
          <button className={styles.drawerItem} onClick={() => setView("support")}>
            <Heart size={16} className={styles.drawerItemIcon} />
            <span className={styles.drawerItemLabel}>Support the project</span>
          </button>

          <div className={styles.drawerDivider} />

          <div className={styles.sectionLabel}>Account</div>
          <button className={styles.drawerItem} onClick={signOut}>
            <LogOut size={16} className={styles.drawerItemIcon} />
            <span className={styles.drawerItemLabel}>Sign out</span>
          </button>
          <button
            className={`${styles.drawerItem} ${styles.drawerItemDanger}`}
            onClick={() => setView("delete-confirm")}
          >
            <Trash2 size={16} className={styles.drawerItemIcon} />
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

      {view === "support" && (
        <>
          <div className={styles.drawerHeader}>
            <button className={styles.drawerBack} onClick={() => setView("menu")}>←</button>
            <span className={styles.drawerTitle}>Support the project</span>
          </div>
          <div className={styles.supportBody}>
            <p className={styles.supportLabel}>Choose amount</p>
            <div className={styles.supportPresets}>
              {PRESETS_EUR.map((eur) => (
                <button
                  key={eur}
                  className={`${styles.supportChip} ${supportAmount === eur && !customAmount ? styles.supportChipActive : ""}`}
                  onClick={() => { setSupportAmount(eur); setCustomAmount(""); }}
                >
                  €{eur}
                </button>
              ))}
            </div>
            <div className={styles.supportCustom}>
              <span className={styles.supportCurrency}>€</span>
              <input
                className={styles.supportInput}
                type="number"
                min="1"
                max="1000"
                step="any"
                placeholder="Your amount"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSupportAmount(0); }}
              />
            </div>
            <button
              className={styles.supportBtn}
              disabled={submitting}
              onClick={async () => {
                const amount = customAmount
                  ? Math.round(parseFloat(customAmount) * 100)
                  : supportAmount * 100;
                if (!amount || amount < 100 || amount > 100000) return;
                setSubmitting(true);
                try {
                  const res = await fetch("/api/stripe/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Something went wrong");
                  }
                  const { url } = await res.json();
                  window.location.href = url;
                } catch (e) {
                  setSupportError(e instanceof Error ? e.message : "Something went wrong");
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Redirecting…" : `Support with ${displayAmount(supportAmount, customAmount)}`}
            </button>
            {supportError && <p className={styles.errorMsg}>{supportError}</p>}
            <p className={styles.supportPaymentRow}>
              We accept:&#8194;
              <img className={styles.supportPaymentIcon} src="/icons/apple-pay.svg" alt="Apple Pay" />
              <img className={styles.supportPaymentIcon} src="/icons/google-pay.svg" alt="Google Pay" />
            </p>
          </div>
        </>
      )}
    </>
  );
}
