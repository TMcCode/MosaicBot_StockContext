import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { PageSurface } from "@/components/PageSurface";
import { ReadStateProvider } from "@/components/ReadStateProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";
import { ThemeRoot } from "@/components/ThemeRoot";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <SupabaseAuthProvider>
          <ReadStateProvider>
            <ThemeRoot>
              <SiteHeader />
              <PageSurface>{children}</PageSurface>
            </ThemeRoot>
          </ReadStateProvider>
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
