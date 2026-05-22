"use client";

import { useDrawer } from "@/lib/drawer-context";
import styles from "./NavUserMenu.module.css";

interface Props {
  displayName: string;
}

export default function NavUserMenu({ displayName }: Props) {
  const { toggle } = useDrawer();
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      className={styles.avatar}
      onClick={toggle}
      aria-label="User menu"
    >
      {initials}
    </button>
  );
}
