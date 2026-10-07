import { NextResponse } from 'next/server'
import { getSubmittedTrangNguyenAttempt } from '@/lib/trangNguyenExam'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { attemptId: string } }) {
  const { attemptId } = params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId))
    return NextResponse.json({ message: 'Phiên thi không tồn tại hoặc đã hết hạn.' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })

  try {
    const attempt = await getSubmittedTrangNguyenAttempt(attemptId)
    if (!attempt) return NextResponse.json({ message: 'Phiên thi không tồn tại hoặc đã hết hạn.' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    return NextResponse.json({ attempt }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[TrangNguyenExam] Could not load submitted attempt', error)
    return NextResponse.json({ message: 'Chưa tải được kết quả bài thi.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
