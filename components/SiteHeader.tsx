import Link from "next/link";

import { LazySiteSearch } from "@/components/LazySiteSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { href } from "@/lib/links";

import styles from "./SiteHeader.module.css";

type Props = {
  tickerCount?: number;
  themeCount?: number;
};

export function SiteHeader({ tickerCount, themeCount }: Props) {
  return (
    <header className={styles.wrap}>
      <nav className={styles.row} aria-label="Primary">
        <Link href={href("/")} className={styles.brand}>
          Stock Context
        </Link>
        <LazySiteSearch />
        <div className={styles.links}>
          <Link href={href("/")}>Home</Link>
          <Link href={href("/tickers")}>Tickers</Link>
          <Link href={href("/themes")}>Themes</Link>
          {tickerCount != null ? (
            <span className={styles.stats}>
              {tickerCount} tickers · {themeCount ?? 0} themes
            </span>
          ) : null}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
