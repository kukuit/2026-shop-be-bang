'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import ProgressCacheSync from '@/components/game/me/ProgressCacheSync'
import { CartProvider } from '@/components/cart/CartProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  // Tạo 1 client cho mỗi mount (safe cho Fast Refresh)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // tùy chỉnh
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <AuthProvider><QueryClientProvider client={queryClient}><CartProvider>
      <ProgressCacheSync />
      {children}
    </CartProvider></QueryClientProvider></AuthProvider>
  )
}
