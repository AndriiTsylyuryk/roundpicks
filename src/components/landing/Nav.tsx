import { Logo } from "./Logo";
import styles from "./Nav.module.css";

export function Nav() {
  return (
    <nav className={styles.nav}>
      <a href="/"><Logo /></a>
      <div className={styles.links}>
        <a href="#how" className={styles.link}>How it works</a>
        <a href="#tournaments" className={styles.link}>Tournaments</a>
        <a href="#about" className={styles.link}>About</a>
        <a href="/login" className={styles.signInBtn}>Sign in</a>
        <a href="/signup" className={styles.createBtn}>Create group →</a>
      </div>
    </nav>
  );
}
