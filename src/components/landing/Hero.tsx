import HeroAnimation from "./HeroAnimation";
import styles from "./Hero.module.css";

type LeaderRow = {
  rank: number;
  name: string;
  points: number;
  you?: boolean;
  hot?: boolean;
};

const ROWS: LeaderRow[] = [
  { rank: 1, name: "maria.k", points: 142, hot: true },
  { rank: 2, name: "peter (you)", points: 138, you: true },
  { rank: 3, name: "navigator.t", points: 124 },
  { rank: 4, name: "kristiina.v", points: 111 },
  { rank: 5, name: "andres.s", points: 98 },
];

export function Hero() {
  return (
    <section className={styles.section} style={{ position: "relative" }}>
      <HeroAnimation />
      <div className={styles.inner} style={{ position: "relative", zIndex: 1 }}>
        <div className={styles.copy}>
          <div className={`eyebrow ${styles.eyebrow}`}>
            ● Group stage open · World Cup 2026
          </div>
          <h1 className={styles.h1}>
            Predict
            <br />
            the&nbsp;<em className={styles.italic}>game.</em>
            <br />
            Beat
            <br />
            your&nbsp;mates.
          </h1>
          <p className={styles.body}>
            Start a group, call every round of the World Cup, and watch the
            leaderboard sort the pundits from the wishful thinkers. Free, no
            money on the line.
          </p>
          <div className={styles.ctas}>
            <a href="/signup" className={styles.primaryBtn}>
              Create a group →
            </a>
            <a href="#how" className={styles.secondaryBtn}>
              How it works
            </a>
          </div>
        </div>

        <div className={styles.panel}>
          <span aria-hidden className={styles.stencil}>
            26
          </span>
          <div className={`eyebrow ${styles.panelEyebrow}`}>
            Leaderboard · Family Cup
          </div>
          <ul className={styles.rows}>
            {ROWS.map((row) => (
              <li
                key={row.rank}
                className={
                  row.you ? `${styles.row} ${styles.rowYou}` : styles.row
                }
              >
                <span className={styles.rowRank}>
                  {String(row.rank).padStart(2, "0")}
                </span>
                <span className={styles.rowName}>
                  {row.name}
                  {row.hot && <span className={styles.hotBadge}>HOT</span>}
                </span>
                <span className={styles.rowPoints}>{row.points}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
