import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>⚽</span>
        <span className={styles.brandName}>Roundpics</span>
      </div>
      <div className={styles.card}>{children}</div>
      <p className={styles.footer}>© 2026 Roundpics · No gambling · Free to play</p>
    </div>
  );
}
