import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const isSafeIntroPath = (value: string) => {
  if (!/^\/games\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/voices\/intro\.mp3$/i.test(value)) return false
  return !value.split('/').some(segment => segment === '.' || segment === '..')
}

/** Check public intro assets server-side so missing lesson files do not create browser 404 entries. */
export async function GET(request: Request) {
  const preferred = new URL(request.url).searchParams.get('path') ?? ''
  if (!isSafeIntroPath(preferred)) return NextResponse.json({ exists: false })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const configuredHost = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL
        ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
        ?? process.env.VERCEL_URL
      : undefined
    const baseUrl = configuredHost
      ? new URL(configuredHost.startsWith('http') ? configuredHost : `https://${configuredHost}`)
      : new URL(request.url)
    const assetUrl = new URL(preferred, baseUrl)
    const response = await fetch(assetUrl, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
    return NextResponse.json({ exists: response.ok }, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return NextResponse.json({ exists: false }, { headers: { 'Cache-Control': 'private, max-age=60' } })
  } finally {
    clearTimeout(timeout)
  }
}
