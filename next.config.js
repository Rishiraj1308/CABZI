/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // optional, but recommended
  swcMinify: true,       // recommended
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
  },
  typescript: {
    // Optional: Ignore TS errors in production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Optional: Ignore ESLint errors in production builds
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
