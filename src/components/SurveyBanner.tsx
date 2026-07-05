"use client";

import { useState } from "react";
import SurveyModal from "./SurveyModal";
import styles from "./SurveyBanner.module.css";

interface Props {
  hasSurveyed: boolean;
}

export default function SurveyBanner({ hasSurveyed }: Props) {
  const [done, setDone] = useState(hasSurveyed);
  const [modalOpen, setModalOpen] = useState(false);

  if (done) return null;

  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.banner}>
          <div className={styles.glowRight} />
          <div className={styles.glowBottom} />

          <span aria-hidden className={styles.iconWrap}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <path d="M4 4.5h12v8.5H8.5L5 16v-3H4V4.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 8.2h6M7 10.6h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>

          <div className={styles.content}>
            <div className={styles.eyebrow}>Launch feedback · 2 min</div>
            <div className={styles.headline}>Help shape RoundPicks — we&rsquo;re all ears.</div>
            <div className={styles.sub}>
              We just launched and your feedback steers what comes next. It only takes a couple of minutes — and
              every answer makes your groups, picks, and leaderboards better.
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cta} onClick={() => setModalOpen(true)}>
              Take the survey <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>

      {modalOpen && <SurveyModal onDone={() => { setDone(true); setModalOpen(false); }} onClose={() => setModalOpen(false)} />}
    </>
  );
}
