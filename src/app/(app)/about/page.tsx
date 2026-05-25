import styles from "./page.module.css";

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <article className={styles.article}>
        <h1 className={styles.title}>About RoundPicks</h1>

        <div className={styles.body}>
          <p className={styles.p}>
            We&apos;re a small team building a better way to enjoy shared
            moments together. What started as a love of football &mdash; and a
            bit of frustration with how prediction games usually work &mdash;
            turned into a simple idea: following an event with a group of
            people should be social, fun, and effortless.
          </p>
          <p className={styles.p}>
            Our mission is to bring people closer through the things they
            already enjoy watching. Predicting outcomes and tracking results
            as a group makes everything more exciting, whether you&apos;re
            watching with family, catching up with old friends, or running a
            friendly competition at the office. It&apos;s the difference
            between watching something happen and being part of it.
          </p>
          <p className={styles.p}>
            To be clear: this is a social prediction experience, not a
            gambling platform. There&apos;s no money on the line &mdash; just
            bragging rights, group chats lighting up after every result, and
            the satisfaction of calling the outcome nobody else saw coming.
          </p>
          <p className={styles.p}>
            We&apos;re starting with football, but we&apos;re just getting
            going. If you have feedback, ideas, or thoughts on where we should
            take this next, we&apos;d love to hear from you at{" "}
            <a href="mailto:info@roundpicks.com" className={styles.emailLink}>
              info@roundpicks.com
            </a>
            .
          </p>
        </div>
      </article>
    </div>
  );
}
