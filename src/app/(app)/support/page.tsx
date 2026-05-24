"use client";

import { useState } from "react";
import styles from "./page.module.css";

const PRESETS_EUR = [1, 3, 10];

function displayAmount(supportAmount: number, customAmount: string): string {
  if (customAmount) {
    const v = parseFloat(customAmount);
    return Number.isFinite(v) ? `€${v}` : "";
  }
  return `€${supportAmount}`;
}

export default function SupportPage() {
  const [supportAmount, setSupportAmount] = useState(3);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done] = useState(
    typeof window !== "undefined" && new URL(window.location.href).searchParams.get("success") === "true",
  );

  async function handleSubmit() {
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
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Thank you! 🎉</h1>
        <p className={styles.sub}>Your support means a lot. It helps keep Roundpicks running.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Support the project</h1>
      <p className={styles.sub}>
        Roundpicks is free to use. If you enjoy it, consider a small donation to help cover hosting, APIs, and domain costs.
      </p>

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

      {error && <p className={styles.error}>{error}</p>}

      <button
        className={styles.cta}
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Redirecting…" : `Support with ${displayAmount(supportAmount, customAmount)}`}
      </button>

      <p className={styles.supportPaymentRow}>
        We accept:&#8194;
        <img className={styles.supportPaymentIcon} src="/icons/apple-pay.svg" alt="Apple Pay" />
        <img className={styles.supportPaymentIcon} src="/icons/google-pay.svg" alt="Google Pay" />
      </p>
    </div>
  );
}
