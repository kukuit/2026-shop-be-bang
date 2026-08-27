'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function safeDestination(value: string | null) {
  if (value === '/admin' || value?.startsWith('/admin/')) return value
  if (value === '/game/me' || value?.startsWith('/game/me/')) return value
  return '/game'
}

export default function ContinueAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const destination = safeDestination(searchParams.get('next'))
    fetch('/api/auth/refresh', { method: 'POST' })
      .then((response) => router.replace(response.ok ? destination : '/game?auth=required'))
      .catch(() => router.replace('/game?auth=required'))
  }, [router, searchParams])

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-700">
      <p className="font-semibold">Đang khôi phục phiên đăng nhập…</p>
    </main>
  )
}
