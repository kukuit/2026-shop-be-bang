const nextConfig = {
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
    ]
  },
  async headers() {
    return [
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
