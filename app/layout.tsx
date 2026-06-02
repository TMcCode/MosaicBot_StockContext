import type { Metadata } from "next";
import Link from "next/link";

import { href, themeHref, tickerHref } from "@/lib/links";
import { loadManifest } from "@/lib/data";

import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Context",
  description: "Portfolio and watchlist earnings context",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const manifest = loadManifest();
  return (
    <html lang="en">
      <body>
        <main>
          <nav className="nav">
            <Link href={href("/")}>Home</Link>
            <Link href={href("/tickers")}>Tickers</Link>
            {manifest ? (
              <span className="muted">
                {manifest.stats?.total_tickers ?? manifest.tickers.length} tickers ·{" "}
                {manifest.stats?.total_themes ?? manifest.themes.length} themes
              </span>
            ) : null}
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
