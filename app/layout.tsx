import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";

import { href } from "@/lib/links";
import { loadManifest } from "@/lib/data";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Stock Context",
  description: "Portfolio and watchlist earnings context",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const manifest = loadManifest();
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <main>
          <header className="site-header">
            <Link href={href("/")} className="site-title">
              Stock Context
            </Link>
            <nav className="nav">
            <Link href={href("/")}>Home</Link>
            <Link href={href("/tickers")}>Tickers</Link>
            <Link href={href("/themes")}>Themes</Link>
            </nav>
            {manifest ? (
              <span className="nav-stats muted">
                {manifest.stats?.total_tickers ?? manifest.tickers.length} tickers ·{" "}
                {manifest.stats?.total_themes ?? manifest.themes.length} themes
              </span>
            ) : null}
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
