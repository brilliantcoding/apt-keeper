import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@apt-keeper/db', '@apt-keeper/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
