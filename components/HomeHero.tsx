import styles from "./HomeHero.module.css";

type Props = {
  buildId?: string;
};

export function HomeHero({ buildId }: Props) {
  const eyebrow =
    process.env.NODE_ENV === "development" && buildId
      ? `stockcontext.ai · ${buildId}`
      : "stockcontext.ai";

  return (
    <header className={styles.hero}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>Portfolio earnings context, organized for every season</h1>
      <p className={styles.punchline}>
        <span className={styles.punchlineLead}>Review</span> thesis notes, bull and bear cases,
        and theme research for holdings in your coverage universe.
      </p>
    </header>
  );
}
