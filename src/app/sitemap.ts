import type { MetadataRoute } from 'next'
import { POSTS } from '@/app/blog/posts'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://camhuuco.vn'
  const now = new Date()
  const stableDate = new Date('2026-01-22T00:00:00+07:00')

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: stableDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: stableDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...[
      '/game', '/game/lop-1', '/game/lop-1/toan', '/game/lop-1/toan/bai-1',
      '/game/lop-1/toan/bai-2', '/game/lop-1/toan/bai-2/drag-drop',
      '/game/lop-1/toan/bai-2/gold-mining', '/game/lop-1/toan/bai-2/racing',
      '/game/lop-1/toan/bai-2/bubble-shooter',
    ].map((path) => ({ url: `${baseUrl}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ]

  const blogPostRoutes: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.date}T00:00:00.000+07:00`), // VN timezone
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...blogPostRoutes]
}
