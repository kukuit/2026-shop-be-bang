import { NextResponse } from 'next/server'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { getShortLink, isShortLinkRedirectType, isShortLinkStatus, updateShortLink } from '@/lib/short-links/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403 | 500) => json({ message: status === 401 ? 'Chưa đăng nhập.' : status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin.' }, status)

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const link = await getShortLink(params.code)
    return link ? json({ link }) : json({ message: 'Không tìm thấy Short Link.' }, 404)
  } catch (error) {
    console.error('[AdminShortLinks] Read failed', error)
    return json({ message: 'Không thể tải Short Link.' }, 500)
  }
}

export async function PATCH(request: Request, { params }: { params: { code: string } }) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ message: 'Thông tin cập nhật không hợp lệ.' }, 400)
    const input = body as Record<string, unknown>
    if (Object.keys(input).some(key => !['title', 'targetUrl', 'status', 'redirectType'].includes(key))) return json({ message: 'Không thể thay đổi mã Short Link.' }, 400)
    if (!Object.keys(input).length) return json({ message: 'Chưa có thông tin cần cập nhật.' }, 400)
    if (input.status !== undefined && !isShortLinkStatus(input.status)) return json({ message: 'Trạng thái không hợp lệ.' }, 400)
    if (input.redirectType !== undefined && !isShortLinkRedirectType(input.redirectType)) return json({ message: 'Kiểu chuyển hướng không hợp lệ.' }, 400)
    if (input.title !== undefined && typeof input.title !== 'string') return json({ message: 'Tiêu đề không hợp lệ.' }, 400)
    if (input.targetUrl !== undefined && typeof input.targetUrl !== 'string') return json({ message: 'URL đích không hợp lệ.' }, 400)
    const link = await updateShortLink(params.code, {
      ...(typeof input.title === 'string' ? { title: input.title } : {}),
      ...(typeof input.targetUrl === 'string' ? { targetUrl: input.targetUrl } : {}),
      ...(isShortLinkStatus(input.status) ? { status: input.status } : {}),
      ...(isShortLinkRedirectType(input.redirectType) ? { redirectType: input.redirectType } : {}),
    })
    return link ? json({ link }) : json({ message: 'Không tìm thấy Short Link.' }, 404)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const messages: Record<string, string> = {
      SHORT_LINK_INVALID_CODE: 'Mã Short Link không hợp lệ.',
      SHORT_LINK_TITLE_TOO_LONG: 'Tiêu đề không được dài quá 160 ký tự.',
      SHORT_LINK_INVALID_STATUS: 'Trạng thái không hợp lệ.',
      SHORT_LINK_INVALID_REDIRECT_TYPE: 'Kiểu chuyển hướng không hợp lệ.',
      SHORT_LINK_TARGET_URL_NOT_EDITABLE: 'Chỉ có thể đổi URL đích của liên kết Custom.',
      SHORT_LINK_INVALID_URL: 'URL đích không hợp lệ.',
      SHORT_LINK_UNSAFE_URL: 'URL đích không an toàn.',
      SHORT_LINK_SENSITIVE_ROUTE: 'Không thể chuyển hướng đến đường dẫn quản trị hoặc API.',
      SHORT_LINK_REDIRECT_LOOP: 'URL đích sẽ tạo vòng lặp chuyển hướng.',
      SHORT_LINK_TARGET_IS_SHORT_LINK: 'URL đích đang trỏ đến một Short Link khác.',
    }
    if (messages[message]) return json({ message: messages[message] }, 400)
    console.error('[AdminShortLinks] Update failed', error)
    return json({ message: 'Không thể cập nhật Short Link.' }, 500)
  }
}
