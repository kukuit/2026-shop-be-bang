'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { Suspense, useEffect, useRef } from 'react'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // gtag('config') below already records the initial page view.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const query = searchParams.toString()
    const pagePath = query ? `${pathname}?${query}` : pathname

    window.gtag?.('config', GA_MEASUREMENT_ID, { page_path: pagePath })
  }, [pathname, searchParams])

  return null
}

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = function(){window.dataLayer.push(arguments);}
          window.gtag('js', new Date());

          window.gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>

      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  )
}

declare global {
  interface Window {
    dataLayer: IArguments[]
    gtag?: (...args: unknown[]) => void
  }
}
