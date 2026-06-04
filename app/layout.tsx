import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { PageSurface } from "@/components/PageSurface";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeRoot } from "@/components/ThemeRoot";
import { loadManifest } from "@/lib/data";
import { themeInitScriptContent } from "@/lib/themeStorage";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Context",
  description: "Portfolio and watchlist earnings context",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const manifest = await loadManifest();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script
          id="stockcontext-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScriptContent() }}
        />
        <ThemeRoot>
          <SiteHeader
            tickerCount={manifest?.stats?.total_tickers ?? manifest?.tickers.length}
            themeCount={manifest?.stats?.total_themes ?? manifest?.themes.length}
          />
          <PageSurface>{children}</PageSurface>
        </ThemeRoot>
      </body>
    </html>
  );
}
