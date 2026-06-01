import styles from "./page.module.css";

export default function HelpPage() {
  return (
    <div className={styles.page}>
      <article className={styles.article}>
        <h1 className={styles.title}>FAQs</h1>
        <div className={styles.accordion}>
          <details className={styles.item} open>
            <summary className={styles.summary}>
              <span>How does it work?</span>
              <svg className={styles.chevron} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </summary>
            <div className={styles.panel}>
              <p className={styles.p}>
                Getting started is simple. Create a group or join an existing
                one, then invite your friends with a shareable link. Once
                everyone&apos;s in, make your predictions for the group phase &mdash; just
                keep an eye on the dates, since predictions close as matches
                begin. Knockout round predictions open up as the group phase
                wraps up and the matchups become available. Pick your winners,
                follow along, and watch the leaderboard come to life as the
                tournament unfolds.
              </p>
            </div>
          </details>

          <details className={styles.item}>
            <summary className={styles.summary}>
              <span>How does scoring work?</span>
              <svg className={styles.chevron} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </summary>
            <div className={styles.panel}>
              <p className={styles.p}>
                You predict each World Cup group by ranking the teams from 1st
                to 3rd, and you&apos;ll also predict the knockout stage winners.
              </p>
              <p className={styles.subhead}>Group stage scoring:</p>
              <ul className={styles.list}>
                <li className={styles.li}>+2 points for each team placed in the exact correct position</li>
                <li className={styles.li}>+1 point for a correct team placed in the wrong spot</li>
              </ul>
              <p className={styles.subhead}>Group stage game results scoring: (Advanced mode only)</p>
              <ul className={styles.list}>
                <li className={styles.li}>+1 point for every correctly predicted game result (either correct winner or draw)</li>
              </ul>
              <p className={styles.subhead}>Best third-placed teams:</p>
              <ul className={styles.list}>
                <li className={styles.li}>+2 points for each correctly predicted team</li>
              </ul>
              <p className={styles.subhead}>Knockout stage scoring:</p>
              <ul className={styles.list}>
                <li className={styles.li}>1-5 points for each correctly predicted winner, depending on the round (later rounds are worth more)</li>
              </ul>
            </div>
          </details>

          <details className={styles.item}>
            <summary className={styles.summary}>
              <span>Can I delete my account?</span>
              <svg className={styles.chevron} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </summary>
            <div className={styles.panel}>
              <p className={styles.p}>
                Yes. You can delete your account at any time from your settings.
                Please note that deletion is permanent &mdash; all your predictions,
                group memberships, and history will be lost, and there&apos;s no way
                to restore an account once it&apos;s been deleted.
              </p>
            </div>
          </details>
        </div>

        <p className={styles.contactText}>Have a question or need help? Write to us:</p>
        <p style={{ margin: "4px 0 0" }}>
          <a href="mailto:info@roundpicks.com" className={styles.contactLink}>
            info@roundpicks.com
          </a>
        </p>
      </article>
    </div>
  );
}
