"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import styles from "./SuccessAnimation.module.css";

interface Props {
  onDone: () => void;
}

export default function SuccessAnimation({ onDone }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.animation}>
        <DotLottieReact
          src="https://lottie.host/c30acc06-ec30-49d8-b6dd-84ea21bef910/83N5lFJkbx.lottie"
          autoplay
          dotLottieRefCallback={(instance) => {
            if (instance) {
              instance.addEventListener("complete", onDone);
            }
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
