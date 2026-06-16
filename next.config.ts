import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for small,
  // dependency-light Docker images.
  output: "standalone",
  // The Prisma client is generated into src/generated/prisma. Make sure
  // its runtime files (incl. the WASM query engine used by the driver
  // adapter) are traced into the standalone output.
  outputFileTracingIncludes: {
    "*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
