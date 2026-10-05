import type { NextConfig } from 'next';

const apiInternalBaseUrl = process.env.API_INTERNAL_BASE_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@property-studio/ui',
    '@property-studio/api-client',
    '@property-studio/contracts',
    '@property-studio/permissions',
    '@property-studio/public-id',
  ],
  async rewrites() {
    // Same-origin proxy so HttpOnly session cookies attach to the web origin.
    // NestJS remains the authentication authority; Next.js does not interpret sessions.
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalBaseUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${apiInternalBaseUrl}/health`,
      },
      {
        source: '/ready',
        destination: `${apiInternalBaseUrl}/ready`,
      },
    ];
  },
};

export default nextConfig;
