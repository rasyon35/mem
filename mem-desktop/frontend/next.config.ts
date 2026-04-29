import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: "./",
  },
  cacheComponents: true,
  reactCompiler: true,
  images: { unoptimized: true },
};

export default nextConfig;
