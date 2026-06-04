"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { SiteSearch } from "@/components/SiteSearch";

import styles from "./SiteSearch.module.css";

const SiteSearchDynamic = dynamic(
  () => import("@/components/SiteSearch").then((m) => m.SiteSearch),
  { ssr: false },
);

export function LazySiteSearch() {
  const isProd = process.env.NODE_ENV === "production";
  const [active, setActive] = useState(false);

  if (!isProd) {
    return <SiteSearch />;
  }

  if (active) return <SiteSearchDynamic />;

  return (
    <div className={styles.wrap}>
      <input
        className={styles.input}
        type="search"
        placeholder="Search ticker, company, or theme…"
        readOnly
        onFocus={() => setActive(true)}
        onPointerDown={() => setActive(true)}
        aria-label="Open search"
      />
    </div>
  );
}
