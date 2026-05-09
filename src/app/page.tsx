import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.badge}>World Cup 2026</div>
        <h1 className={styles.heroTitle}>
          Predict the <span>Beautiful Game</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Create a prediction group with friends or family, pick your winners, and see who knows football best.
        </p>
        <div className={styles.heroCta}>
          <Link href="/signup" className={styles.btnPrimary}>
            Create a group →
          </Link>
          <Link href="/login" className={styles.btnSecondary}>
            Sign in
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        © 2026 Roundpics · Not affiliated with FIFA · No gambling
      </footer>
    </div>
  );
}
