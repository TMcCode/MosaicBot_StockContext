import Link from "next/link";

import { LazySiteSearch } from "@/components/LazySiteSearch";
import { SiteNavAuth } from "@/components/SiteNavAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { href } from "@/lib/links";

import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.wrap}>
      <nav className={styles.row} aria-label="Primary">
        <Link href={href("/")} className={styles.brand}>
          Stock Context
        </Link>
        <LazySiteSearch />
        <div className={styles.links}>
          <div className="site-nav-browse">
            <button
              type="button"
              className="site-nav-browse-trigger"
              aria-haspopup="menu"
              aria-expanded={false}
            >
              Browse
              <span className="site-nav-browse-chevron" aria-hidden="true">
                ▾
              </span>
            </button>
            <div className="site-nav-browse-panel" role="menu">
              <Link href={href("/themes")} className="site-nav-browse-item" role="menuitem">
                All themes
              </Link>
              <Link href={href("/tickers")} className="site-nav-browse-item" role="menuitem">
                All tickers
              </Link>
            </div>
          </div>
          <SiteNavAuth />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
