import type { NextConfig } from "next";
import path from "node:path";

const raizMonorepo = path.resolve(process.cwd(), "..");
const apiInterna = process.env.INTERNAL_API_URL ?? "http://localhost:4000";
const directivaUpgradeSeguro =
  process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : "";
const directivaEvalDesarrollo =
  process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=()",
  },
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${directivaEvalDesarrollo}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'${directivaUpgradeSeguro}`,
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: raizMonorepo,
  turbopack: { root: raizMonorepo },
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
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
