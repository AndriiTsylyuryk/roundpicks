"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./NotificationBell.module.css";

interface SiteNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

function BodyLines({ text, className }: { text: string; className: string }) {
  const lines = text.split("\n").filter(Boolean);
  return lines.length > 1 ? (
    lines.map((line, i) => <p key={i} className={className}>{line}</p>)
  ) : (
    <p className={className}>{text}</p>
  );
}

export default function NotificationBell() {
  const [notification, setNotification] = useState<SiteNotification | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: notifs, error: notifError } = await supabase
        .from("site_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      if (notifError || !notifs || notifs.length === 0) return;

      const notif = notifs[0];
      if (user.created_at && new Date(notif.created_at) < new Date(user.created_at)) return;

      setNotification(notif);

      const { data: profile } = await supabase
        .from("profiles")
        .select("dismissed_notifications")
        .eq("id", user.id)
        .single();
      const dismissedArr = (profile?.dismissed_notifications ?? []) as string[];
      const isDismissed = dismissedArr.includes(notif.id);
      setDismissed(isDismissed);

      if (!isDismissed) {
        setShowModal(true);
      }
    })();
  }, []);

  async function dismiss(notifId: string) {
    if (!userId) return;
    setDismissed(true);
    setShowModal(false);

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("dismissed_notifications")
      .eq("id", userId)
      .single();
    const existing = (profile?.dismissed_notifications ?? []) as string[];
    const next = [...new Set([...existing, notifId])];
    const { error } = await supabase
      .from("profiles")
      .update({ dismissed_notifications: next })
      .eq("id", userId);

    if (error) console.error("Failed to dismiss notification:", error);
  }

  return (
    <>
      <button
        className={styles.bellBtn}
        onClick={() => setShowPanel((p) => !p)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {notification && !dismissed && (
          <span className={styles.bellBadge}>1</span>
        )}
      </button>

      <AnimatePresence>
        {showModal && notification && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={styles.modalCard}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <h2 className={styles.modalTitle}>{notification.title}</h2>
              <BodyLines className={styles.modalBody} text={notification.body} />
              <button className={styles.ackBtn} onClick={() => dismiss(notification.id)}>
                Acknowledge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div
              className={styles.panelOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanel(false)}
            />
            <motion.div
              className={styles.panel}
              initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <div className={styles.panelHeader}>Notifications</div>
              {!notification ? (
                <p className={styles.panelEmpty}>No notifications yet</p>
              ) : (
                <ul className={styles.panelList}>
                  <li className={`${styles.panelItem} ${dismissed ? "" : styles.panelItemUnread}`}>
                    <div className={styles.panelItemTitle}>{notification.title}</div>
                    <BodyLines className={styles.panelItemBody} text={notification.body} />
                  </li>
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
