"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/landing/Logo";
import NavUserMenu from "@/components/NavUserMenu";
import UserMenuDrawer from "@/components/UserMenuDrawer";
import { LayoutDashboard, Heart, LifeBuoy, Info } from "lucide-react";
import { useDrawer } from "@/lib/drawer-context";
import styles from "./layout.module.css";

interface Props {
  displayName: string;
  children: React.ReactNode;
}

const DRAWER_W = 320;

export function AppShell({ displayName, children }: Props) {
  const { open, close } = useDrawer();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <motion.div
        className={styles.shell}
        animate={{ x: open ? -DRAWER_W : 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.brand}>
            <Logo />
          </Link>
          <div className={styles.navActions}>
            <Link href="/dashboard" className={styles.navLink}><LayoutDashboard size={16} /> Dashboard</Link>
            <Link href="/help" className={styles.navLink}><LifeBuoy size={16} /> Help</Link>
            <Link href="/about" className={styles.navLink}><Info size={16} /> About</Link>
            <Link href="/support" className={styles.navLink}><Heart size={16} /> Support the project</Link>
            <NavUserMenu displayName={displayName} />
          </div>
        </nav>
        <main className={styles.main}>{children}</main>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            className={styles.drawer}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <UserMenuDrawer displayName={displayName} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
