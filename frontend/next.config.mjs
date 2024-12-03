import withPWA from "next-pwa";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  ...withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
  }),
};

export default nextConfig;
