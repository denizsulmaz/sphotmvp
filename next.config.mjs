/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS || false;
const basePath = isGithubActions ? '/sphotmvp' : '';

const nextConfig = {
  basePath: basePath,
  assetPrefix: basePath + '/',
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
