import { cn } from "@/lib/cn";
import styles from "./Logo.module.css";

type LogoProps = {
  light?: boolean;
  className?: string;
};

export function Logo({ light = false, className }: LogoProps) {
  return (
    <div className={cn(styles.logo, className)}>
      <span className={styles.pill} aria-hidden>RP</span>
      <span className={cn(styles.wordmark, light ? styles.light : "")}>
        RoundPicks
      </span>
    </div>
  );
}
