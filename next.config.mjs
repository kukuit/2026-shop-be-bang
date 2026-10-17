const nextConfig = {
  devIndicators: { buildActivity: false },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/demo/chatbot/:path*',
        destination: '/demo/aqua/:path*',
        permanent: true,
      },
      {
        source: '/chatbot/demo/:path*',
        destination: '/demo/aqua/:path*',
        permanent: true,
      },
      {
        source: '/game/lop-1/tieng-viet/bai-:week',
        destination: '/game/lop-1/tieng-viet/tuan-:week',
        permanent: true,
      },
      {
        source: '/game/lop-1/tieng-viet/bai-:week/:path*',
        destination: '/game/lop-1/tieng-viet/tuan-:week/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/demo/ai-task/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' }],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/favicon-20260112.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/icon-192-v2.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/icon-48-v2.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ]
  },
}

export default nextConfig
