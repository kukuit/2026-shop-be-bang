import { NextRequest, NextResponse } from 'next/server'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/config'

const ICON_ALLOWLIST = [
  '/favicon.ico',
  '/favicon-20260112.ico',
  '/icon-48-v2.png',
  '/icon-192-v2.png',
  '/apple-touch-icon-v2.png',
  '/site.webmanifest',
]

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname, search } = req.nextUrl

  if (host.startsWith('www.')) {
    // Cho phép các file icon được trả 200 trên www (không redirect)
    if (ICON_ALLOWLIST.includes(pathname)) return NextResponse.next()

    const url = req.nextUrl.clone()
    url.host = host.replace(/^www\./, '')
    url.pathname = pathname
    url.search = search
    return NextResponse.redirect(url, 308)
  }

  // Chặn guest sớm. Server layout/API vẫn phải verify token, session, status và role admin.
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/')
  if ((isAdminPage || isAdminApi) && !req.cookies.get(ACCESS_COOKIE)?.value) {
    if (isAdminApi) return NextResponse.json({ message: 'Chưa đăng nhập.' }, { status: 401 })
    if (req.cookies.get(REFRESH_COOKIE)?.value) {
      const continueUrl = req.nextUrl.clone()
      continueUrl.pathname = '/auth/continue'
      continueUrl.search = `next=${encodeURIComponent(`${pathname}${search}`)}`
      return NextResponse.redirect(continueUrl)
    }
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/'
    loginUrl.search = 'auth=required'
    return NextResponse.redirect(loginUrl)
  }

  const isGameMe = pathname === '/game/me' || pathname.startsWith('/game/me/')
  if (isGameMe && !req.cookies.get(ACCESS_COOKIE)?.value) {
    if (req.cookies.get(REFRESH_COOKIE)?.value) {
      const continueUrl = req.nextUrl.clone()
      continueUrl.pathname = '/auth/continue'
      continueUrl.search = `next=${encodeURIComponent(`${pathname}${search}`)}`
      return NextResponse.redirect(continueUrl)
    }
    const gameUrl = req.nextUrl.clone()
    gameUrl.pathname = '/game'
    gameUrl.search = 'auth=required'
    return NextResponse.redirect(gameUrl)
  }

  return NextResponse.next()
}

// Áp middleware cho mọi path (vì mình đã allowlist ở trên)
export const config = {
  matcher: ['/:path*'],
}
