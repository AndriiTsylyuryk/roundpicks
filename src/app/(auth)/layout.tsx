import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="/" className={styles.brand}>Roundpicks</a>
      <div className={styles.card}>{children}</div>
      <p className={styles.footer}>© 2026 Roundpicks · No gambling · Free to play</p>
    </div>
  );
}
