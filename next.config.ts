import type { NextConfig } from "next";

let basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
if (basePath && !basePath.startsWith("/")) {
  basePath = `/${basePath}`;
}

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDev ? {} : { output: "export" }),
  trailingSlash: true,
  images: { unoptimized: true },
  async rewrites() {
    if (!isDev) return [];
    // Chart sidecars fetch same-origin in dev (CDN CORS only whitelists localhost:3000).
    return [
      {
        source: "/stockthemes-data/:path*",
        destination: "https://storage.stockthemes.ai/:path*",
      },
    ];
  },
  allowedDevOrigins: ["192.168.1.218"],
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
