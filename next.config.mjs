/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Next.js 16+ when using webpack config for dev
  turbopack: {},
  experimental: {
    optimizeCss: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Reduce HMR overhead in development
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,           // Check for changes every 1 second
        aggregateTimeout: 300, // Wait 300ms after change before rebuilding
        ignored: ['**/node_modules/**', '**/.git/**', '**/django_backend/**', '**/.next/**'],
      }
    }
    return config
  },
}

export default nextConfig

