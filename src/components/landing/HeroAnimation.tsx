"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import styles from "./HeroAnimation.module.css";

export default function HeroAnimation() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.flyer}>
        <DotLottieReact
          src="https://lottie.host/87352de7-3f03-42fd-9c02-076045f266e2/a9rYEtxcpe.lottie"
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
