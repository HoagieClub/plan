import withPWA from 'next-pwa';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    // TODO: This can be done in a more modern/better way (Hooks -> Route Handlers)
    HOAGIEPLAN: process.env.HOAGIEPLAN,
    BACKEND: process.env.BACKEND,
  },
  reactStrictMode: true,
  experimental: {
    webpackMemoryOptimizations: true,
    reactCompiler: true, // Enable the React 19 compiler!
    // ppr: 'incremental', // Only available in canary for now
    after: true,
    optimizePackageImports: ['icon-library'],
    staleTimes: {
      dynamic: 30,
    },
    // turbo: {
    //   resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
    //   moduleIdStrategy: 'deterministic',
    //   useSwcCss: true,
    //   treeShaking: true,
    //   memoryLimit: 1024 * 1024 * 512, // 512 MB memory limit
    // },
  },
  ...withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
  }),
};

export default withBundleAnalyzer(nextConfig);
