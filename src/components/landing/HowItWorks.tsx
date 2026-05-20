import styles from "./HowItWorks.module.css";

const STEPS = [
  { n: 1, title: "Start or join a group",    body: "One link, send to the chat. Family, mates, the whole office." },
  { n: 2, title: "Make your predictions",    body: "Rank the groups, call the knockouts, lock your champion." },
  { n: 3, title: "Follow along live",        body: "Fixtures and scores sync automatically. No manual updates." },
  { n: 4, title: "See who actually knows",   body: "Live leaderboard. Real-time bragging rights." },
];

export function HowItWorks() {
  return (
    <section id="how" className={styles.section}>
      <div className={styles.inner}>
        <div className="eyebrow" style={{ color: "var(--color-mint)" }}>How it works</div>
        <h2 className={styles.h2}>
          Four steps to a properly competitive group chat.
        </h2>
        <div className={styles.grid}>
          {STEPS.map((step, i) => (
            <article key={step.n} className={i < 3 ? styles.step : `${styles.step} ${styles.stepLast}`}>
              <span aria-hidden className={styles.stepNum}>0{step.n}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
