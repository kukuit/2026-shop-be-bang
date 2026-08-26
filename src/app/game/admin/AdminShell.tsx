'use client'

import { usePathname } from 'next/navigation'

export default function AdminShell({ dashboard, legacy }: { dashboard: React.ReactNode; legacy: React.ReactNode }) {
  const pathname = usePathname()
  return pathname === '/game/admin/dashboard' ? dashboard : legacy
}
