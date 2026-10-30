'use client'

import { useEffect, useMemo, useState } from 'react'
import { resolveProductPricing } from '@/lib/products/pricing'
import type { HomeBannerProduct, PublicProduct } from '@/lib/products/types'

type PriceBearingProduct = PublicProduct | HomeBannerProduct

export function useLiveProductPricing(product: PriceBearingProduct) {
  const [now, setNow] = useState(() => {
    const evaluatedAt = product.priceSummary?.calculatedAt
    const timestamp = evaluatedAt ? Date.parse(evaluatedAt) : Number.NaN
    return Number.isFinite(timestamp) ? new Date(timestamp) : new Date()
  })
  const summary = useMemo(() => resolveProductPricing(product, product.variants, { now }), [product, now])

  useEffect(() => {
    if (!summary.nextPriceChangeAt) return
    const changeAt = Date.parse(summary.nextPriceChangeAt)
    if (!Number.isFinite(changeAt)) return
    const delay = Math.max(0, changeAt - Date.now() + 5)
    const timer = window.setTimeout(() => setNow(new Date()), Math.min(delay, 2_147_000_000))
    return () => window.clearTimeout(timer)
  }, [summary.nextPriceChangeAt])

  return { now, summary }
}
