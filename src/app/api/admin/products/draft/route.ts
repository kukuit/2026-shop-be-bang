import { NextResponse } from 'next/server'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { createProductDraft } from '@/lib/products/draft-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return NextResponse.json({ message: auth.status === 401 ? 'Chưa đăng nhập.' : auth.status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin. Hãy thử lại.' }, { status: auth.status })
  try {
    return NextResponse.json(createProductDraft(auth.user.id), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[AdminProducts] Draft ID allocation failed', error)
    return NextResponse.json({ message: 'Không cấp được mã sản phẩm tạm thời.' }, { status: 500 })
  }
}
