import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { DynamicAuthRoot } from "@/components/DynamicAuthRoot";
import { PageSurface } from "@/components/PageSurface";
import { ReadStateProvider } from "@/components/ReadStateProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeRoot } from "@/components/ThemeRoot";
import { themeInitScriptContent } from "@/lib/themeStorage";
import { STOCKTHEMES_PUBLIC_BASE_URL } from "@/lib/chart/stockthemesPublicBase";

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
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href={STOCKTHEMES_PUBLIC_BASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={STOCKTHEMES_PUBLIC_BASE_URL} />
      </head>
      <body>
        <Script
          id="stockcontext-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScriptContent() }}
        />
        <DynamicAuthRoot>
          <ReadStateProvider>
            <ThemeRoot>
              <SiteHeader />
              <PageSurface>{children}</PageSurface>
              <ScrollToTop />
            </ThemeRoot>
          </ReadStateProvider>
        </DynamicAuthRoot>
      </body>
    </html>
  );
}
