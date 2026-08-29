'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { refreshAccessToken } from '@/lib/auth/client-refresh'

function safeDestination(value: string | null) {
  if (value === '/admin' || value?.startsWith('/admin/')) return value
  if (value === '/game/me' || value?.startsWith('/game/me/')) return value
  return '/game'
}

function ContinueAuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const destination = safeDestination(searchParams.get('next'))
    refreshAccessToken()
      .then((result) => router.replace(result.ok ? destination : '/game?auth=required'))
      .catch(() => router.replace('/game?auth=required'))
  }, [router, searchParams])

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-700">
      <p className="font-semibold">Đang khôi phục phiên đăng nhập…</p>
    </main>
  )
}

export default function ContinueAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-700">
          <p className="font-semibold">Đang khôi phục phiên đăng nhập…</p>
        </main>
      }
    >
      <ContinueAuthContent />
    </Suspense>
  )
}
