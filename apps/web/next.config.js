/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['lucide-react'],
  // Standalone output for Docker - creates optimized production build
  output: 'standalone',
  // Skip TypeScript type checking during build for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, '.'),
    };
    return config;
  },
};

module.exports = nextConfig;
