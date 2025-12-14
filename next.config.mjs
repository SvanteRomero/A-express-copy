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
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
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

