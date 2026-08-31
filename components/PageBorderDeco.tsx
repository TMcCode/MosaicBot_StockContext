import { publicAssetPath } from "@/lib/links";

import styles from "./PageBorderDeco.module.css";

type DecoImgProps = {
  className: string;
  src: string;
  width: number;
  height: number;
};

function DecoImg({ className, src, width, height }: DecoImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- decorative SVG from public/
    <img
      className={className}
      src={src}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
    />
  );
}

/** Soft galaxy/spring art in the gutter around the main card (all `.page` shells). */
export function PageBorderDeco() {
  const galaxy = publicAssetPath("/brand/home-deco-galaxy.svg");
  const galaxyDark = publicAssetPath("/brand/home-deco-galaxy-dark.svg");
  const spring = publicAssetPath("/brand/home-deco-spring.svg");
  const springDark = publicAssetPath("/brand/home-deco-spring-dark.svg");

  return (
    <div className={styles.wrap} aria-hidden>
      <DecoImg
        className={`${styles.img} ${styles.light} ${styles.galaxyTR}`}
        src={galaxy}
        width={420}
        height={315}
      />
      <DecoImg
        className={`${styles.img} ${styles.dark} ${styles.galaxyTR}`}
        src={galaxyDark}
        width={420}
        height={315}
      />
      <DecoImg
        className={`${styles.img} ${styles.light} ${styles.galaxyBL}`}
        src={galaxy}
        width={320}
        height={240}
      />
      <DecoImg
        className={`${styles.img} ${styles.dark} ${styles.galaxyBL}`}
        src={galaxyDark}
        width={320}
        height={240}
      />
      <DecoImg
        className={`${styles.img} ${styles.light} ${styles.springTL}`}
        src={spring}
        width={360}
        height={290}
      />
      <DecoImg
        className={`${styles.img} ${styles.dark} ${styles.springTL}`}
        src={springDark}
        width={360}
        height={290}
      />
      <DecoImg
        className={`${styles.img} ${styles.light} ${styles.springBR}`}
        src={spring}
        width={300}
        height={240}
      />
      <DecoImg
        className={`${styles.img} ${styles.dark} ${styles.springBR}`}
        src={springDark}
        width={300}
        height={240}
      />
    </div>
  );
}
