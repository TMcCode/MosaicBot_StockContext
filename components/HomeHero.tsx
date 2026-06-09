import styles from "./HomeHero.module.css";

type Props = {
  buildId?: string;
};

export function HomeHero({ buildId }: Props) {
  const eyebrow =
    process.env.NODE_ENV === "development" && buildId
      ? `stockcontext.info · ${buildId}`
      : "stockcontext.info";

  return (
    <header className={styles.hero}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>Institutional-grade research for everyone</h1>
      <p className={styles.punchline}>
        <span className={styles.punchlineLead}>Get up to speed</span>{" "}
        on what&apos;s moving your names — thesis, catalysts, and the equity research real
        investors use.
      </p>
    </header>
  );
}
