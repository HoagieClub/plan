import withPWA from "next-pwa";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    HOAGIEPLAN: process.env.HOAGIEPLAN,
    BACKEND: process.env.BACKEND,
  },
  reactStrictMode: true,
  ...withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
  }),
};

export default nextConfig;
