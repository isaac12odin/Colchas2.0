import type { NextConfig } from "next";
import path from "node:path";

const raizMonorepo = path.resolve(process.cwd(), "..");
const apiInterna = process.env.INTERNAL_API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: raizMonorepo,
  turbopack: { root: raizMonorepo },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInterna}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
