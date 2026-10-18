import { NextResponse } from 'next/server'
import { getShortLinkRecord, recordShortLinkClick, resolveShortLinkDestination } from '@/lib/short-links/service'
import { getShortLinkSiteOrigin } from '@/lib/short-links/rules'
import { isValidShortCode } from '@/lib/short-links/codes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const notFound = () => new NextResponse(null, {
  status: 404,
  headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
})

export async function GET(request: Request, { params }: { params: { shortCode: string } }) {
  const code = params.shortCode
  if (!isValidShortCode(code)) return notFound()

  try {
    const record = await getShortLinkRecord(code)
    if (!record) return notFound()
    const destination = await resolveShortLinkDestination(record)
    if (!destination) return notFound()

    // Counting is best effort so Firestore latency or failure cannot delay the redirect.
    void recordShortLinkClick(code).catch(error => console.error('[ShortLinks] Click count failed', error))

    const response = NextResponse.redirect(new URL(destination, getShortLinkSiteOrigin()), record.redirectType)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return response
  } catch (error) {
    console.error('[ShortLinks] Redirect failed', error)
    return notFound()
  }
}
