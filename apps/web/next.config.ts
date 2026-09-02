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
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
