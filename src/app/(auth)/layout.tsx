import { Logo } from "@/components/landing/Logo";
import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="/"><Logo /></a>
      <div className={styles.card}>{children}</div>
      <p className={styles.footer}>© 2026 RoundPicks · No gambling · Free to play</p>
    </div>
  );
}
