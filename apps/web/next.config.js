/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@learning-os/shared", "@learning-os/ui"],
};

module.exports = nextConfig;
