import { Logo } from "./Logo";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Logo light />
      <div className={styles.links}>
        <span>© 2026 RoundPicks</span>
        <span>Not affiliated with FIFA</span>
        <span>No gambling · No money</span>
        <span>hello@roundpicks.app</span>
      </div>
    </footer>
  );
}
