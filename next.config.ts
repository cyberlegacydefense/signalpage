import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate a unique build ID for version checking
  generateBuildId: async () => {
    // Use git commit SHA on Vercel, or timestamp for other environments
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
           `build-${Date.now()}`;
  },
};

export default nextConfig;
