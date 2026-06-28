import styles from "./FinalCallBanner.module.css";
import localStyles from "./KnockoutBanner.module.css";

export function KnockoutBanner() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <span aria-hidden className={styles.accent} />
        <span aria-hidden className={`${styles.iconWrap} ${localStyles.iconWrap}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2.5 2 13.5h12L8 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r=".75" fill="currentColor" />
          </svg>
        </span>
        <div className={styles.content}>
          <div className={styles.title}>
            Knockout bracket predictions are open!
          </div>
          <div className={`${styles.sub} ${localStyles.sub}`}>
            The group phase is complete, and the final tournament bracket is
            open. You have until 10:00 PM (UTC+3) tonight to predict the entire
            knockout phase all the way to the final. Predictions lock exactly
            when the first game kicks off. Get yours in now!
          </div>
        </div>
      </div>
    </div>
  );
}
