import type { NextConfig } from "next";

let basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
if (basePath && !basePath.startsWith("/")) {
  basePath = `/${basePath}`;
}

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
