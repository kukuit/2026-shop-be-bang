export const SHORT_LINK_TARGET_TYPES = ['product', 'article', 'category', 'game', 'custom'] as const
export type ShortLinkTargetType = (typeof SHORT_LINK_TARGET_TYPES)[number]
export type ShortLinkStatus = 'ACTIVE' | 'DISABLED'
export type ShortLinkRedirectType = 301 | 302
export type ShortLinkMode = 'auto' | 'manual'

export interface ShortLink {
  code: string
  targetType: ShortLinkTargetType
  targetId: string | null
  targetUrl: string
  title: string
  status: ShortLinkStatus
  redirectType: ShortLinkRedirectType
  clickCount: number | null
  createdAt: string | null
  updatedAt: string | null
  createdBy?: string
  resolvedTargetUrl?: string | null
}

export interface CreateShortLinkInput {
  targetType: ShortLinkTargetType
  targetId?: string | null
  targetUrl?: string
  mode: ShortLinkMode
  customCode?: string
  title?: string
}

export interface ListShortLinksOptions {
  limit: number
  cursor?: string
  targetType?: ShortLinkTargetType
  status?: ShortLinkStatus
  targetId?: string
  search?: string
}
