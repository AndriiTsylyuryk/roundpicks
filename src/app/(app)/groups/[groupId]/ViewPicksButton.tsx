"use client";

import { useState } from "react";
import PicksModal from "./PicksModal";
import styles from "./page.module.css";

interface Props {
  userId: string;
  userName: string;
  groupId: string;
  groupMode: string;
}

export default function ViewPicksButton({ userId, userName, groupId, groupMode }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={styles.viewPicksBtn}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      >
        View picks
      </button>
      <PicksModal
        isOpen={open}
        onClose={() => setOpen(false)}
        groupId={groupId}
        userName={userName}
        userId={userId}
        groupMode={groupMode}
      />
    </>
  );
}
