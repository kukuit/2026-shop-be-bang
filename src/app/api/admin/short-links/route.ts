import { NextResponse } from 'next/server'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { createShortLink, isShortLinkStatus, isShortLinkTargetType, listShortLinks } from '@/lib/short-links/service'
import type { CreateShortLinkInput } from '@/lib/short-links/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403 | 500) => json({ message: status === 401 ? 'Chưa đăng nhập.' : status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin.' }, status)

export async function GET(request: Request) {
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  const params = new URL(request.url).searchParams
  const limit = Number(params.get('limit') ?? 20)
  const rawTargetType = params.get('targetType')
  const rawStatus = params.get('status')
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return json({ message: 'Số liên kết mỗi trang không hợp lệ.' }, 400)
  if (rawTargetType && !isShortLinkTargetType(rawTargetType)) return json({ message: 'Loại liên kết không hợp lệ.' }, 400)
  if (rawStatus && !isShortLinkStatus(rawStatus)) return json({ message: 'Trạng thái không hợp lệ.' }, 400)
  const targetType = rawTargetType && isShortLinkTargetType(rawTargetType) ? rawTargetType : undefined
  const status = rawStatus && isShortLinkStatus(rawStatus) ? rawStatus : undefined
  const targetId = params.get('targetId') ?? undefined
  if (targetId && targetId.length > 180) return json({ message: 'Mã đích không hợp lệ.' }, 400)
  try {
    return json(await listShortLinks({
      limit,
      cursor: params.get('cursor') ?? undefined,
      targetType,
      status,
      targetId,
      search: params.get('search') ?? undefined,
    }))
  } catch (error) {
    if (error instanceof Error && error.message === 'SHORT_LINK_INVALID_CURSOR') return json({ message: 'Trang liên kết đã hết hạn. Hãy tải lại danh sách.' }, 400)
    console.error('[AdminShortLinks] List failed', error)
    return json({ message: 'Không thể tải danh sách Short Link.' }, 500)
  }
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ message: 'Thông tin Short Link không hợp lệ.' }, 400)
    const input = body as Record<string, unknown>
    const createInput: CreateShortLinkInput = {
      targetType: input.targetType as CreateShortLinkInput['targetType'],
      targetId: typeof input.targetId === 'string' ? input.targetId : undefined,
      targetUrl: typeof input.targetUrl === 'string' ? input.targetUrl : undefined,
      mode: input.mode as CreateShortLinkInput['mode'],
      customCode: typeof input.customCode === 'string' ? input.customCode : undefined,
      title: typeof input.title === 'string' ? input.title : undefined,
    }
    const code = await createShortLink(createInput, auth.user.id)
    return json({ code }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const validationMessages: Record<string, string> = {
      SHORT_LINK_INVALID_MODE: 'Kiểu tạo liên kết không hợp lệ.',
      SHORT_LINK_INVALID_TARGET_TYPE: 'Loại liên kết không hợp lệ.',
      SHORT_LINK_INVALID_TARGET_ID: 'Mã đích không hợp lệ.',
      SHORT_LINK_TITLE_TOO_LONG: 'Tiêu đề không được dài quá 160 ký tự.',
      SHORT_LINK_INVALID_CODE: 'Mã tùy chỉnh cần có 4–32 ký tự thường hoặc số, và không trùng đường dẫn có sẵn.',
      SHORT_LINK_CODE_TAKEN: 'Mã Short Link này đã được sử dụng.',
      SHORT_LINK_INVALID_URL: 'URL đích không hợp lệ.',
      SHORT_LINK_UNSAFE_URL: 'URL đích không an toàn.',
      SHORT_LINK_SENSITIVE_ROUTE: 'Không thể chuyển hướng đến đường dẫn quản trị hoặc API.',
      SHORT_LINK_TARGET_REQUIRED: 'Cần chọn đối tượng đích.',
      SHORT_LINK_TARGET_NOT_FOUND: 'Không tìm thấy đích đang hiển thị công khai.',
      SHORT_LINK_TARGET_URL_REQUIRED: 'Cần nhập URL đích.',
      SHORT_LINK_REDIRECT_LOOP: 'URL đích sẽ tạo vòng lặp chuyển hướng.',
      SHORT_LINK_TARGET_IS_SHORT_LINK: 'URL đích đang trỏ đến một Short Link khác.',
      SHORT_LINK_CODE_RETRIES_EXHAUSTED: 'Chưa tạo được mã mới. Vui lòng thử lại.',
    }
    if (validationMessages[message]) {
      const status = message === 'SHORT_LINK_CODE_TAKEN' ? 409 : message === 'SHORT_LINK_TARGET_NOT_FOUND' ? 404 : 400
      return json({ message: validationMessages[message] }, status)
    }
    console.error('[AdminShortLinks] Create failed', error)
    return json({ message: 'Không thể tạo Short Link.' }, 500)
  }
}
