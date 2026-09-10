import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { entities } from '../../_lib/model'
import { previewImport, importRows } from '../../_services/excel'
export const runtime = 'nodejs'
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) throw new Error('Origin không hợp lệ')
    const raw = await req.text(); if (raw.length > 2000000) throw new Error('Dữ liệu quá lớn')
    const b = z.object({ entity: z.enum(entities), rows: z.array(z.record(z.string(), z.unknown())).max(500), mapping: z.record(z.string(), z.string()), confirm: z.boolean().optional(), fileName: z.string().max(200), requestId: z.string() }).parse(JSON.parse(raw))
    return NextResponse.json(b.confirm ? await importRows(b.entity, b.rows, b.mapping, b.fileName, b.requestId) : await previewImport(b.entity, b.rows, b.mapping))
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Import thất bại' }, { status: 400 }) }
}
