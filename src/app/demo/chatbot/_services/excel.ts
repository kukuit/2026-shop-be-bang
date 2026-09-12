import 'server-only'
import * as XLSX from 'xlsx'
import { createHash } from 'crypto'
import { Entity, entities, modules, normalize, validate, Dataset, displayName, dateKey } from '../_lib/model'
import { getDemoData, getDemoCollection, getDemoRoot } from './repository'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { mutate } from './business'
import { Timestamp } from 'firebase-admin/firestore'

export type ImportPreview = { row: number; data: Record<string, unknown>; errors: string[] }
export async function previewImport(entity: Entity, rows: Record<string, unknown>[], mapping: Record<string, string>) {
  if (!entities.includes(entity) || rows.length > 500) throw new Error('Chọn module hợp lệ và tối đa 500 dòng/lần')
  const db = await getDemoData()
  const seen = new Set<string>()
  const result: ImportPreview[] = []
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]; const data: Record<string, unknown> = {}; const errors: string[] = []
    for (const [field, column] of Object.entries(mapping)) if (column && row[column] !== undefined && row[column] !== '') data[field] = row[column]
    if (entity === 'transactions' && (data.income || data.expense)) {
      if (Number(data.income) > 0 && Number(data.expense) > 0) errors.push('Thu và chi cùng có giá trị')
      data.type = Number(data.income) > 0 ? 'income' : 'expense'; data.amount = Number(data.income) > 0 ? data.income : data.expense
    }
    for (const field of modules[entity].fields) {
      if (field.ref && data[field.key]) {
        const value = normalize(String(data[field.key]))
        const matches = db[field.ref].filter(r => [r.id, r.name, r.code].some(v => normalize(String(v || '')) === value) && (field.key !== 'cropId' || !data.pondId || r.pondId === data.pondId))
        if (matches.length !== 1) errors.push(`${field.label}: không tồn tại hoặc có nhiều kết quả`)
        else data[field.key] = matches[0].id
      }
      if (field.kind === 'date' || field.kind === 'datetime-local') {
        const value = data[field.key]
        if (typeof value === 'number') { const d = XLSX.SSF.parse_date_code(value); if (d) data[field.key] = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}${field.kind === 'datetime-local' ? `T${String(d.H).padStart(2, '0')}:${String(d.M).padStart(2, '0')}` : ''}` }
        else if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) { const [day, month, year] = value.split('/'); data[field.key] = `${year}-${month}-${day}` }
      }
    }
    if (data.cropId && data.pondId && !db.crops.some(c => c.id === data.cropId && c.pondId === data.pondId)) errors.push('Vụ không thuộc ao')
    try { Object.assign(data, validate(entity, data)) } catch (e) { errors.push(e instanceof Error ? e.message : 'Dữ liệu lỗi') }
    const canonical = JSON.stringify(Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b))))
    if (seen.has(canonical)) errors.push('Dòng trùng trong file'); seen.add(canonical)
    if (db[entity].some(existing => modules[entity].fields.every(f => String(existing[f.key] ?? '') === String(data[f.key] ?? '')))) errors.push('Dòng đã tồn tại trong hệ thống')
    result.push({ row: index + 2, data, errors })
  }
  return result
}
export async function importRows(entity: Entity, rows: Record<string, unknown>[], mapping: Record<string, string>, fileName: string, requestId: string) {
  if (!/^[\w-]{1,100}$/.test(requestId)) throw new Error('ID import không hợp lệ')
  const job = getDemoCollection('importJobs').doc(requestId)
  const fingerprint = fileHash({ entity, rows, mapping })
  const old = await job.get()
  if (old.exists && old.get('fingerprint') !== fingerprint) throw new Error('Nội dung import đã thay đổi. Tạo yêu cầu mới.')
  if (old.get('status') === 'completed') return old.data()
  const expectedGeneration = Number((await getDemoRoot().get()).get('generation') || 0)
  const updateJob = async (value: Record<string, unknown>) => getAdminDb().runTransaction(async tx => {
    const root = await tx.get(getDemoRoot())
    if (root.get('resetting') || Number(root.get('generation') || 0) !== expectedGeneration) throw new Error('Import bị dừng vì dữ liệu đã reset')
    tx.set(job, value, { merge: true })
    tx.set(getDemoRoot(), { revision: Number(root.get('revision') || 0) + 1 }, { merge: true })
  })
  const preview = await previewImport(entity, rows, mapping)
  // A retry uses per-row receipts; existing rows are allowed only for that same job.
  if (preview.some(r => r.errors.some(e => e !== 'Dòng đã tồn tại trong hệ thống' || !old.exists))) throw new Error('Còn dòng lỗi. Sửa file/mapping và xem trước lại.')
  await updateJob({ fingerprint, fileName: fileName.slice(0, 200), entityType: entity, totalRows: rows.length, successRows: 0, errorRows: 0, status: 'running', createdAt: Timestamp.now() })
  let successRows = 0
  try {
    for (const row of preview) { await mutate({ entity, operation: 'save', data: row.data, requestId: `import_${requestId}_${row.row}`, source: 'import', expectedGeneration }); successRows++ }
    const result = { successRows, errorRows: 0, status: 'completed' }; await updateJob(result); return result
  } catch (e) { await updateJob({ successRows, errorRows: rows.length - successRows, status: 'failed' }).catch(() => {}); throw e }
}
export function exportWorkbook(db: Dataset, entity?: Entity, from?: string, to?: string) {
  const book = XLSX.utils.book_new()
  for (const key of entity ? [entity] : entities) {
    const dateField = modules[key].fields.find(f => f.kind === 'date' || f.kind === 'datetime-local')?.key || 'createdAt'
    const rows = db[key].filter(r => (!from || dateKey(r[dateField]) >= from) && (!to || dateKey(r[dateField]) <= to)).map(r => {
      const result: Record<string, unknown> = { ...r }
      for (const field of modules[key].fields) {
        if (field.ref && r[field.key]) result[field.key.replace('Id', 'Name')] = displayName(db[field.ref].find(x => x.id === r[field.key]))
        if ((field.kind === 'date' || field.kind === 'datetime-local') && r[field.key]) result[field.key] = new Date(String(r[field.key]))
      }
      for (const k of ['createdAt', 'updatedAt', 'completedAt']) if (r[k]) result[k] = new Date(String(r[k]))
      return result
    })
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(modules[key].fields.map(f => [f.key, '']))], { dateNF: 'dd/mm/yyyy hh:mm' })
    sheet['!cols'] = Array.from({ length: 30 }, () => ({ wch: 24 }))
    XLSX.utils.book_append_sheet(book, sheet, key)
  }
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
export const fileHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
