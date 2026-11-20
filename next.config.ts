import type { NextConfig } from "next";

// Content-Security-Policy: limits what a page may load or run, so injected markup can't pull in outside scripts,
// frames or forms. Next.js adds small inline scripts to every page, so 'unsafe-inline' is needed for scripts; the
// rest of the policy (no plugins, no outside frames, forms and base URL locked to this site) still applies.
// Stripe (card form) and Google Maps (map on the Map page) are the only outside services allowed.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.stripe.com https://*.googleapis.com https://*.gstatic.com https://*.google.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.stripe.com https://m.stripe.network",
  "frame-src https://*.stripe.com https://m.stripe.network https://www.google.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Build from this folder, not a parent folder that happens to have its own package-lock.json.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    agentFeedback: true,
    // The whole stylesheet is ~12 KB: inlining removes a render-blocking request.
    inlineCss: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        ],
      },
    ];
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
