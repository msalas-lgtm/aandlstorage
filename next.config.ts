import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build from this folder, not a parent folder that happens to have its own package-lock.json.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
