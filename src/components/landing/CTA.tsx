import styles from "./CTA.module.css";

export function CTA() {
  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <span aria-hidden className={styles.stencil}>GO</span>
        <div className={styles.content}>
          <h2 className={styles.h2}>
            Get the group chat<br />talking. Properly.
          </h2>
          <p className={styles.sub}>Free · sets up in a minute · no app to install.</p>
        </div>
        <a href="/signup" className={styles.btn}>Create a group →</a>
      </div>
    </section>
  );
}
