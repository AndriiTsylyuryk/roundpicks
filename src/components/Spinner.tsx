"use client";

import { Oval } from "react-loader-spinner";
import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: number;
  color?: string;
}

export default function Spinner({ size = 40, color = "var(--color-teal)" }: SpinnerProps) {
  return (
    <div className={styles.wrapper}>
      <Oval
        height={size}
        width={size}
        color={color}
        secondaryColor={color}
        strokeWidth={4}
        strokeWidthSecondary={4}
        ariaLabel="loading"
        visible
      />
    </div>
  );
}
