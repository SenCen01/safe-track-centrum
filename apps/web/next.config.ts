import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium locates its bundled binary via relative paths at
  // runtime — bundling it (the Next.js default for route handler deps)
  // relocates those files and breaks that lookup. See
  // https://github.com/Sparticuz/chromium#bundler-configuration
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // serverExternalPackages alone isn't enough on Vercel: its build only
  // deploys the files its output file tracer can statically discover, and
  // chromium's Brotli binaries are read via a dynamic runtime path, not a
  // traceable require()/import — so they're silently dropped from the
  // deployed function unless explicitly included here.
  // This is an npm workspace — @sparticuz/chromium hoists to the monorepo
  // ROOT node_modules (confirmed locally: apps/web/node_modules has no such
  // package at all), not apps/web/node_modules, so the pattern must reach
  // two directories up. Kept both locations since hoisting behavior isn't
  // guaranteed to stay this way — an absent path just matches nothing.
  outputFileTracingIncludes: {
    "/api/**": ["../../node_modules/@sparticuz/chromium/**", "./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
