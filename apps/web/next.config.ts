import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@property-studio/ui',
    '@property-studio/api-client',
    '@property-studio/contracts',
    '@property-studio/permissions',
    '@property-studio/public-id',
  ],
};

export default nextConfig;
