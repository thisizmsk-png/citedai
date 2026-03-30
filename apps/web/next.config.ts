import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@citedai/db", "@citedai/shared", "@citedai/scoring"],
};

export default nextConfig;
