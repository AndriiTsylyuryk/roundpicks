"use client";

import { useState } from "react";
import styles from "./ComingSoon.module.css";

const TEASERS = [
  { label: "UEFA Champions League", hint: "Club football" },
  { label: "Domestic leagues", hint: "EPL \u00B7 La Liga \u00B7 more" },
  { label: "Euro 2028", hint: "National teams" },
  { label: "Beyond football", hint: "New sports" },
];

interface Props {
  knownEmail: string;
  initialDone?: boolean;
}

export default function ComingSoon({ knownEmail, initialDone = false }: Props) {
  const [done, setDone] = useState(initialDone);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function confirm(addr: string) {
    setDone(true);
    fetch("/api/keep-posted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addr }),
    }).catch(() => {});
  }

  return (
    <div className={styles.wrapper}>
      <div aria-hidden className={styles.orbRight} />
      <div aria-hidden className={styles.orbLeft} />

      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            The World Cup is wrapping up
          </div>

          <h2 className={styles.heading}>
            This was just the <span className={styles.lime}>kickoff.</span>
          </h2>
          <p className={styles.body}>
            We&rsquo;re not slowing down after the final whistle. Bigger tournaments, more leagues and whole new
            sports are in the works — we&rsquo;re still shaping exactly what lands first, but there&rsquo;s a lot coming.
          </p>

          <div className={styles.teasers}>
            {TEASERS.map((t) => (
              <div key={t.label} className={styles.teaser}>
                <span className={styles.teaserLabel}>{t.label}</span>
                <span className={styles.teaserHint}>{t.hint}</span>
              </div>
            ))}
            <div className={styles.teaserMore}>+ more</div>
          </div>
        </div>

        <div className={styles.right}>
          {done ? (
            <div className={styles.doneWrap}>
              <div className={styles.checkIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.doneTitle}>You&rsquo;re on the list.</div>
              <div className={styles.doneSub}>
                We&rsquo;ll reach out at <strong>{editing && valid ? email : knownEmail}</strong> the moment we have exciting news. No spam — just the good stuff.
              </div>
            </div>
          ) : (
            <>
              <div className={styles.eyebrowMono}>Be first in line</div>
              <div className={styles.ctaTitle}>Want to know what&rsquo;s next?</div>
              <div className={styles.ctaSub}>
                We&rsquo;ll be in touch the moment we have exciting news to share — just confirm you&rsquo;re in.
              </div>

              {!editing ? (
                <>
                  <div className={styles.emailChip}>
                    <span aria-hidden className={styles.emailIcon}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3.5 5.5l6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className={styles.emailText}>{knownEmail}</span>
                  </div>
                  <button type="button" className={styles.confirmBtn} onClick={() => confirm(knownEmail)}>
                    Yes, keep me posted <span aria-hidden>→</span>
                  </button>
                  <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>
                    Use a different email
                  </button>
                </>
              ) : (
                <form className={styles.editForm} onSubmit={(e) => { e.preventDefault(); if (valid) confirm(email); }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    aria-label="Email address"
                    autoFocus
                    className={styles.emailInput}
                  />
                  <button type="submit" disabled={!valid} className={styles.submitBtn}>
                    Keep me posted <span aria-hidden>→</span>
                  </button>
                  <button type="button" className={styles.editLink} onClick={() => { setEditing(false); setEmail(""); }}>
                    Use my account email instead
                  </button>
                </form>
              )}

              <div className={styles.disclaimer}>
                No spam, unsubscribe anytime. We&rsquo;ll only email about new launches.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
