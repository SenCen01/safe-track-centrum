import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium locates its bundled binary via relative paths at
  // runtime — bundling it (the Next.js default for route handler deps)
  // relocates those files and breaks that lookup. See
  // https://github.com/Sparticuz/chromium#bundler-configuration
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
