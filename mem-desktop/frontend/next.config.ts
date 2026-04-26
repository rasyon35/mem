import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // @ts-expect-error Next.js experimental option may not be typed yet
    turbopack: {
      root: "./",
    }
  },
  reactCompiler: true,
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
