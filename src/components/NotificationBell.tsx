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

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<SiteNotification[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: notifs } = await supabase
        .from("site_notifications")
        .select("*")
        .order("created_at", { ascending: false }) as unknown as { data: SiteNotification[] | null };
      if (!notifs || notifs.length === 0) return;
      setNotifications(notifs);

      const { data: profile } = await supabase
        .from("profiles")
        .select("dismissed_notifications")
        .eq("id", user.id)
        .single() as unknown as { data: { dismissed_notifications: string[] } | null };
      const dismissed = new Set(profile?.dismissed_notifications ?? []);
      setDismissedIds(dismissed);

      const latest = notifs[0];
      if (!dismissed.has(latest.id)) {
        setShowModal(true);
      }
    })();
  }, []);

  async function dismiss(notifId: string) {
    if (!userId) return;
    const next = new Set(dismissedIds).add(notifId);
    setDismissedIds(next);
    setShowModal(false);

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ dismissed_notifications: [...next] } as never)
      .eq("id", userId);
  }

  return (
    <>
      <button
        className={styles.bellBtn}
        onClick={() => setShowPanel((p) => !p)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {notifications.filter((n) => !dismissedIds.has(n.id)).length > 0 && (
          <span className={styles.bellBadge}>{notifications.filter((n) => !dismissedIds.has(n.id)).length}</span>
        )}
      </button>

      <AnimatePresence>
        {showModal && notifications.length > 0 && (
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
              <h2 className={styles.modalTitle}>{notifications[0].title}</h2>
              <p className={styles.modalBody}>{notifications[0].body}</p>
              <button className={styles.ackBtn} onClick={() => dismiss(notifications[0].id)}>
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
              {notifications.length === 0 ? (
                <p className={styles.panelEmpty}>No notifications yet</p>
              ) : (
                <ul className={styles.panelList}>
                  {notifications.map((n) => (
                    <li key={n.id} className={`${styles.panelItem} ${dismissedIds.has(n.id) ? "" : styles.panelItemUnread}`}>
                      <div className={styles.panelItemTitle}>{n.title}</div>
                      <div className={styles.panelItemBody}>{n.body}</div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
