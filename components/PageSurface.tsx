import type { ReactNode } from "react";

import { PageBorderDeco } from "@/components/PageBorderDeco";

import styles from "./PageSurface.module.css";

type Props = {
  children: ReactNode;
};

/** Standard page shell: themed background, gutter deco, centered main column. */
export function PageSurface({ children }: Props) {
  return (
    <div className={`st-surface ${styles.page}`}>
      <PageBorderDeco />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
