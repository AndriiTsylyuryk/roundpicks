import styles from "./FinalCallBanner.module.css";
import localStyles from "./KnockoutBanner.module.css";

export function KnockoutBanner() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <span aria-hidden className={styles.accent} />
        <span aria-hidden className={styles.iconWrap}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.4V8l2.4 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <div className={styles.content}>
          <div className={styles.title}>
            Knockout bracket predictions are coming!
          </div>
          <div className={`${styles.sub} ${localStyles.sub}`}>
            The complete tournament bracket opens early morning on June 28th, right after the final group game finishes. You&rsquo;ll have a short window to predict the entire knockout phase all the way to the final. Predictions lock that same day at 10:00 PM (UTC+3) when the first knockout game kicks off. Get ready to act fast!
          </div>
        </div>
      </div>
    </div>
  );
}
