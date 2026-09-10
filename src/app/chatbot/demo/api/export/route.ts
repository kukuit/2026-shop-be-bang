import { NextRequest, NextResponse } from 'next/server'
import { entities, Entity } from '../../_lib/model'
import { getDemoData } from '../../_services/repository'
import { exportWorkbook } from '../../_services/excel'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  try {
    const entity = req.nextUrl.searchParams.get('entity') as Entity | null
    if (entity && !entities.includes(entity)) throw new Error('Module không hợp lệ')
    const buffer = exportWorkbook(await getDemoData(), entity || undefined, req.nextUrl.searchParams.get('from') || undefined, req.nextUrl.searchParams.get('to') || undefined)
    return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="chatbot-demo.xlsx"', 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Không xuất được dữ liệu' }, { status: 400 }) }
}
