"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LeaveGroupButton.module.css";

export default function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "leaving">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function leave() {
    setStep("leaving");
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      setStep("confirm");
    }
  }

  if (step === "idle") {
    return (
      <button className={styles.trigger} onClick={() => setStep("confirm")}>
        Leave group
      </button>
    );
  }

  return (
    <div className={styles.confirmRow}>
      <span className={styles.warning}>Your picks will be permanently deleted.</span>
      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.actions}>
        <button
          className={styles.confirmBtn}
          onClick={leave}
          disabled={step === "leaving"}
        >
          {step === "leaving" ? "Leaving…" : "Yes, leave group"}
        </button>
        <button className={styles.cancelBtn} onClick={() => { setStep("idle"); setError(null); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
