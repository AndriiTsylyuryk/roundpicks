import styles from "./Tournaments.module.css";

const CARDS = [
  { tag: "Live now",    title: "World Cup 2026", body: "48 teams · 12 groups · 104 matches",        when: "Jun 11 — Jul 19", primary: true },
  { tag: "Coming next", title: "Eurovision",     body: "Pick the winner, jury chaos, douze points.", when: "May 2026" },
  { tag: "On the radar", title: "Euro 2028",     body: "Group rankings · knockouts · dark-horse pool.", when: "Summer 2028" },
];

export function Tournaments() {
  return (
    <section id="tournaments" className={styles.section}>
      <div className={styles.inner}>
        <div className="eyebrow" style={{ color: "var(--color-teal)" }}>Tournaments</div>
        <h2 className={styles.h2}>On the schedule.</h2>
        <div className={styles.grid}>
          {CARDS.map((card) => (
            <article key={card.title} className={card.primary ? `${styles.card} ${styles.cardPrimary}` : styles.card}>
              <div className={card.primary ? `eyebrow ${styles.tagPrimary}` : `eyebrow ${styles.tag}`}>{card.tag}</div>
              <h3 className={styles.title}>{card.title}</h3>
              <p className={card.primary ? styles.bodyPrimary : styles.body}>{card.body}</p>
              <div className={card.primary ? `eyebrow ${styles.whenPrimary}` : `eyebrow ${styles.when}`}>{card.when}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
