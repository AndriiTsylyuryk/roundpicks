"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import styles from "./SurveyModal.module.css";

const ENJOYED_OPTIONS = [
  { value: "competing_with_friends", label: "Competing with friends / colleagues" },
  { value: "following_tournament", label: "Following the tournament through predictions" },
  { value: "leaderboard_scoring", label: "The leaderboard and scoring" },
  { value: "simplicity", label: "The simplicity of the product" },
  { value: "other", label: "Other" },
] as const;

const EVENTS_OPTIONS = [
  { value: "champions_league", label: "Champions League / other club football" },
  { value: "other_football", label: "Other football tournaments (Euros, Copa América)" },
  { value: "other_sports", label: "Basketball, Rugby, Tennis, Cricket" },
  { value: "esports", label: "Esports" },
  { value: "non_sports", label: "Non-sports (Eurovision, reality TV, awards)" },
  { value: "other", label: "Other" },
] as const;

interface Props {
  onDone: () => void;
  onClose: () => void;
}

export default function SurveyModal({ onDone, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [enjoyedMost, setEnjoyedMost] = useState<string[]>([]);
  const [enjoyedMostOther, setEnjoyedMostOther] = useState("");
  const [frustrating, setFrustrating] = useState("");
  const [wantEvents, setWantEvents] = useState<string[]>([]);
  const [wantEventsOther, setWantEventsOther] = useState("");
  const [improvement, setImprovement] = useState("");
  const [chatOptIn, setChatOptIn] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const totalSteps = 5;

  function toggleEnjoyed(value: string) {
    setFieldError(null);
    setEnjoyedMost((prev) => {
      if (prev.includes(value)) {
        if (value === "other") setEnjoyedMostOther("");
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= 2 && value !== "other") return prev;
      return [...prev, value];
    });
  }

  function toggleEvents(value: string) {
    setFieldError(null);
    setWantEvents((prev) => {
      if (prev.includes(value)) {
        if (value === "other") setWantEventsOther("");
        return prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  }

  function validateStep(): boolean {
    setFieldError(null);
    if (step === 0 && enjoyedMost.length === 0) {
      setFieldError("Please select at least one option.");
      return false;
    }
    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function prevStep() {
    setFieldError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (!validateStep()) return;

    setSubmitting(true);
    setError(null);
    const promise = fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enjoyed_most: enjoyedMost,
        enjoyed_most_other: enjoyedMostOther.trim() || null,
        frustrating: frustrating.trim() || null,
        want_events: wantEvents,
        want_events_other: wantEventsOther.trim() || null,
        improvement: improvement.trim() || null,
        chat_opt_in: chatOptIn === true,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("submit_failed");
        }
        return res.json();
      });

    toast.promise(promise, {
      loading: "Submitting…",
      success: "Submitted! Thanks for your feedback.",
      error: "Something went wrong. Please try again.",
    });

    try {
      await promise;
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.stepBar}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ""}`} />
          ))}
        </div>

        <div className={styles.header}>
          <div className={styles.eyebrow}>Quick user survey</div>
          <h2 className={styles.headline}>
            {step === 0 && "What did you enjoy most?"}
            {step === 1 && "What was the most frustrating or missing?"}
            {step === 2 && "Which other events would you want to predict on?"}
            {step === 3 && "What's the one thing you'd most want us to improve or add?"}
            {step === 4 && "Open to a 15-min chat with us?"}
          </h2>
          {step === 0 && <p className={styles.hint}>Pick up to 2</p>}
        </div>

        <div className={styles.body}>
          {step === 0 && (
            <>
              <div className={styles.options}>
                {ENJOYED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.opt} ${enjoyedMost.includes(opt.value) ? styles.optSelected : ""}`}
                    onClick={() => toggleEnjoyed(opt.value)}
                  >
                    <span className={styles.optCheck}>
                      <span className={styles.checkIcon}>✓</span>
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
              {enjoyedMost.includes("other") && (
                <div className={styles.otherTextSection}>
                  <label htmlFor="otherText" className={styles.otherTextLabel}>What specifically did you enjoy most?</label>
                  <textarea
                    id="otherText"
                    className={styles.otherTextArea}
                    placeholder="Please share your specific interest..."
                    value={enjoyedMostOther}
                    onChange={(e) => setEnjoyedMostOther(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <textarea
              className={styles.textarea}
              placeholder="Tell us what could have been better..."
              value={frustrating}
              onChange={(e) => setFrustrating(e.target.value)}
              rows={4}
            />
          )}

          {step === 2 && (
            <>
              <div className={styles.options}>
                {EVENTS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.opt} ${wantEvents.includes(opt.value) ? styles.optSelected : ""}`}
                    onClick={() => toggleEvents(opt.value)}
                  >
                    <span className={styles.optCheck}>
                      <span className={styles.checkIcon}>✓</span>
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
              {wantEvents.includes("other") && (
                <div className={styles.otherTextSection}>
                  <label htmlFor="otherEventsText" className={styles.otherTextLabel}>Please specify other events</label>
                  <textarea
                    id="otherEventsText"
                    className={styles.otherTextArea}
                    placeholder="Specify what other events you'd like to predict on..."
                    value={wantEventsOther}
                    onChange={(e) => setWantEventsOther(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <textarea
              className={styles.textarea}
              placeholder="Your answer..."
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              rows={4}
            />
          )}

          {step === 4 && (
            <div className={styles.chatSection}>
              <button
                type="button"
                className={`${styles.opt} ${chatOptIn === true ? styles.optSelected : ""}`}
                onClick={() => setChatOptIn(true)}
              >
                <span className={styles.optDot}>
                  <span className={styles.optDotInner} />
                </span>
                Yes — happy to share more
              </button>
              <button
                type="button"
                className={`${styles.opt} ${chatOptIn === false ? styles.optSelected : ""}`}
                onClick={() => setChatOptIn(false)}
              >
                <span className={styles.optDot}>
                  <span className={styles.optDotInner} />
                </span>
                No thanks
              </button>
            </div>
          )}

          {fieldError && <p className={styles.error}>{fieldError}</p>}
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          {step > 0 && (
            <button type="button" className={styles.backBtn} onClick={prevStep}>
              Back
            </button>
          )}
          <div className={styles.footerRight}>
            {step < totalSteps - 1 ? (
              <button type="button" className={styles.nextBtn} onClick={nextStep}>
                Next
              </button>
            ) : (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
