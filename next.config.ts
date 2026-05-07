import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Explicitly set the workspace root so Next.js doesn't accidentally
    // pick up a stray package-lock.json from a parent directory.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
