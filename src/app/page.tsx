import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo}>Roundpicks</a>
          <nav className={styles.nav}>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#about" className={styles.navLink}>About Us</a>
            <a href="/login" className={styles.navLink}>Log In</a>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>
            Make every match more exciting.
          </h1>
          <p className={styles.heroSubtitle}>
            Create a group, make your predictions, and see who comes out on top.
          </p>
          <Link href="/signup" className={styles.ctaBtn}>
            Make your Roundpick
          </Link>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.animWrap}>
            <div className={`${styles.matchCard} ${styles.card1}`}>
              <span className={styles.flag}>🇧🇷</span>
              <div className={styles.matchInfo}>
                <span className={styles.teamName}>Brazil</span>
                <span className={styles.vs}>vs</span>
                <span className={styles.teamName}>Argentina</span>
              </div>
              <span className={styles.flag}>🇦🇷</span>
            </div>

            <div className={styles.ball}>⚽</div>

            <div className={`${styles.matchCard} ${styles.card2}`}>
              <span className={styles.flag}>🇫🇷</span>
              <div className={styles.matchInfo}>
                <span className={styles.teamName}>France</span>
                <span className={styles.vs}>vs</span>
                <span className={styles.teamName}>England</span>
              </div>
              <span className={styles.flag}>🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
            </div>

            <div className={`${styles.scoreCard} ${styles.card3}`}>
              <span className={styles.scorePick}>Your pick</span>
              <span className={styles.scoreVal}>3 — 1</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
      </section>

      <section id="about" className={styles.section}>
        <h2 className={styles.sectionTitle}>About Us</h2>
      </section>
    </div>
  );
}
