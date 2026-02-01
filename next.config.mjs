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
  // Preserve trailing slashes for API routes (Django expects them)
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Railway: use internal URL (free egress), Local: use localhost
    const djangoUrl = process.env.DJANGO_INTERNAL_URL || 'http://127.0.0.1:8000';

    return [
      // Explicit rule for trailing slash URLs (Django expects these)
      {
        source: '/api/:path*/',
        destination: `${djangoUrl}/api/:path*/`,
      },
      // Fallback for URLs without trailing slash
      {
        source: '/api/:path*',
        destination: `${djangoUrl}/api/:path*`,
      },
    ]
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
        poll: 10,           // Check for changes every 0.01 second
        aggregateTimeout: 30, // Wait 30ms after change before rebuilding
        ignored: ['**/node_modules/**', '**/.git/**', '**/django_backend/**', '**/.next/**'],
      }
    }
    return config
  },
}

export default nextConfig

