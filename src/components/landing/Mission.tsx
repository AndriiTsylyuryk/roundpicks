import styles from "./Mission.module.css";

export function Mission() {
  return (
    <section id="about" className={styles.section}>
      <div className={styles.inner}>
        <div>
          <div className="eyebrow" style={{ color: "var(--color-teal)" }}>Our mission</div>
          <ul className={styles.bullets}>
            <li>— &nbsp;social, not financial</li>
            <li>— &nbsp;family-safe, ad-free</li>
            <li>— &nbsp;always free for groups</li>
          </ul>
        </div>
        <div>
          <p className={styles.headline}>
            Bring people together through the&nbsp;sport — without turning matches
            into a{" "}
            <span className={styles.gradientText}>betting slip.</span>
          </p>
          <p className={styles.body}>
            We started this because the existing prediction games are clunky,
            full of ads, or pushing odds. RoundPicks is a simple, accessible
            experience for families, mates and offices to enjoy a tournament
            together — and to find out who actually knows their football.
          </p>
        </div>
      </div>
    </section>
  );
}
