"use client";

import { useState } from "react";
import styles from "./FeedbackModal.module.css";

interface Props {
  onDone: () => void;
}

export default function FeedbackModal({ onDone }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          message: message.trim() || null,
          page: "knockout_picks",
        }),
      });
      if (!res.ok) throw new Error("submit_failed");
      onDone();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const displayed = hover ?? rating;

  return (
    <div role="dialog" aria-modal="true" className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.eyebrow}>Quick question</div>
          <h2 className={styles.headline}>How are you finding the app?</h2>
          <p className={styles.sub}>
            Your picks are in. Take 10 seconds to help us improve.
          </p>
        </div>

        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n !== 1 ? "s" : ""}`}
              className={`${styles.star} ${displayed !== null && n <= displayed ? styles.starFilled : ""}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
            >
              ★
            </button>
          ))}
        </div>

        {rating !== null && (
          <div className={styles.label}>{RATING_LABELS[rating]}</div>
        )}

        <textarea
          className={styles.textarea}
          placeholder="Anything you'd like to share? (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="button"
          className={styles.submitBtn}
          onClick={submit}
          disabled={!rating || submitting}
        >
          {submitting ? "Submitting…" : "Submit & continue"}
        </button>
      </div>
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Not good",
  2: "Could be better",
  3: "It's okay",
  4: "Pretty good!",
  5: "Love it!",
};
