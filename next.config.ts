import type { NextConfig } from "next";

// For GitHub Pages: set basePath to your repo name.
// Change "your-garden" to your actual repo name.
const repoName = "garden";
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  // Use standalone for Vercel/regular hosting, export for GitHub Pages
  output: isGitHubPages ? "export" : "standalone",
  // GitHub Pages serves at https://USER.github.io/REPO/, so we need basePath
  basePath: isGitHubPages ? `/${repoName}` : "",
  assetPrefix: isGitHubPages ? `/${repoName}/` : undefined,
  // Static export needs images unoptimized
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
