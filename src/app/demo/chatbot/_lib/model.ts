import { z } from 'zod'

export const entities = ['tasks', 'partners', 'categories', 'transactions', 'ponds', 'crops', 'cropExpenses', 'harvests', 'receivables', 'payables'] as const
export type Entity = typeof entities[number]
export const collections = [...entities, 'reminders', 'chatMessages', 'auditLogs', 'importJobs', 'settings'] as const
export type Collection = typeof collections[number]
export type Row = { id: string; [key: string]: string | number | boolean | null | undefined }
export type Dataset = Record<Collection, Row[]>
export type Field = { key: string; label: string; kind?: 'number' | 'money' | 'date' | 'datetime-local' | 'textarea'; options?: string[]; ref?: Entity; required?: boolean }
const f = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, ...extra })
const name = f('name', 'Tên', { required: true })
const code = f('code', 'Mã', { required: true })
const description = f('description', 'Nội dung', { required: true })
const note = f('note', 'Ghi chú', { kind: 'textarea' })
const status = (options: string[]) => f('status', 'Trạng thái', { options, required: true })
const ref = (key: string, label: string, entity: Entity, required = false) => f(key, label, { ref: entity, required })
const partner = ref('partnerId', 'Đối tác', 'partners')
const pond = ref('pondId', 'Ao nuôi', 'ponds')
const crop = ref('cropId', 'Vụ nuôi', 'crops')
const category = ref('categoryId', 'Danh mục', 'categories')
const money = (key = 'amount', label = 'Số tiền (VND)', required = true) => f(key, label, { kind: 'money', required })
const date = (key: string, label: string, required = true) => f(key, label, { kind: 'date', required })
const attachment = f('attachmentUrl', 'URL chứng từ')
const debt = [ref('partnerId', 'Đối tác', 'partners', true), money('originalAmount', 'Nợ ban đầu'), description, date('dueAt', 'Hạn thanh toán', false), pond, crop, note]
export const modules: Record<Entity, { title: string; fields: Field[] }> = {
  tasks: { title: 'Công việc', fields: [f('title', 'Tiêu đề', { required: true }), f('description', 'Mô tả', { kind: 'textarea' }), f('dueAt', 'Hạn hoàn thành', { kind: 'datetime-local', required: true }), status(['pending', 'in_progress', 'completed', 'cancelled']), f('priority', 'Ưu tiên', { options: ['normal', 'low', 'high', 'urgent'] }), partner, pond, crop, ref('transactionId', 'Giao dịch', 'transactions'), f('remindAt', 'Nhắc lúc', { kind: 'datetime-local' })] },
  partners: { title: 'Đối tác', fields: [name, f('type', 'Loại', { options: ['supplier', 'customer', 'both', 'other'] }), f('phone', 'Điện thoại'), f('address', 'Địa chỉ'), f('taxCode', 'Mã số thuế'), status(['active', 'inactive']), note] },
  categories: { title: 'Danh mục', fields: [name, f('type', 'Loại', { options: ['expense', 'income'], required: true })] },
  ponds: { title: 'Ao nuôi', fields: [code, name, f('area', 'Diện tích (m²)', { kind: 'number' }), f('location', 'Vị trí'), status(['active', 'inactive', 'maintenance']), note] },
  crops: { title: 'Vụ nuôi', fields: [ref('pondId', 'Ao nuôi', 'ponds', true), code, name, date('startDate', 'Ngày bắt đầu'), date('expectedEndDate', 'Dự kiến kết thúc', false), date('endDate', 'Ngày kết thúc', false), status(['planning', 'active', 'harvesting', 'completed', 'cancelled']), f('seedQuantity', 'Số lượng giống', { kind: 'number' }), money('seedCost', 'Giá giống tham khảo (chưa tính chi phí)', false), note] },
  transactions: { title: 'Thu / Chi', fields: [f('type', 'Loại', { options: ['income', 'expense'], required: true }), money(), description, date('transactionDate', 'Ngày giao dịch'), partner, category, pond, crop, attachment, note] },
  cropExpenses: { title: 'Chi phí vụ nuôi', fields: [ref('pondId', 'Ao nuôi', 'ponds', true), ref('cropId', 'Vụ nuôi', 'crops', true), ref('categoryId', 'Danh mục', 'categories', true), money(), description, date('expenseDate', 'Ngày chi'), partner, attachment, note] },
  harvests: { title: 'Thu hoạch tôm', fields: [ref('pondId', 'Ao nuôi', 'ponds', true), ref('cropId', 'Vụ nuôi', 'crops', true), date('harvestDate', 'Ngày thu'), f('harvestNo', 'Lần thu', { kind: 'number' }), f('quantityKg', 'Sản lượng (kg)', { kind: 'number', required: true }), f('shrimpSize', 'Size (con/kg)', { kind: 'number' }), money('pricePerKg', 'Giá / kg'), partner, f('paymentStatus', 'Thanh toán', { options: ['unpaid', 'partial', 'paid'], required: true }), money('paidAmount', 'Đã thanh toán', false), attachment, note] },
  receivables: { title: 'Phải thu', fields: debt }, payables: { title: 'Phải trả', fields: debt },
}
export const labels: Record<string, string> = { pending: 'Chờ xử lý', in_progress: 'Đang làm', completed: 'Hoàn thành', cancelled: 'Đã hủy', normal: 'Bình thường', low: 'Thấp', high: 'Cao', urgent: 'Khẩn cấp', active: 'Hoạt động', inactive: 'Ngừng hoạt động', maintenance: 'Bảo trì', planning: 'Chuẩn bị', harvesting: 'Đang thu', income: 'Thu', expense: 'Chi', paid: 'Đã thanh toán', partial: 'Một phần', unpaid: 'Chưa thanh toán', overdue: 'Quá hạn', supplier: 'Nhà cung cấp', customer: 'Khách hàng', both: 'Cả hai', other: 'Khác' }
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
export function parseMoney(value: unknown): number {
  if (typeof value === 'number') return value
  let s = normalize(String(value ?? '')).replace(/\s|₫|vnd/g, '')
  const unit = /ty$/.test(s) ? 1e9 : /trieu$|tr$/.test(s) ? 1e6 : /nghin$|ngan$|k$/.test(s) ? 1e3 : 1
  s = s.replace(/ty$|trieu$|tr$|nghin$|ngan$|k$/, '')
  if (unit === 1) s = s.replace(/\.(?=\d{3}(?:\.|$))/g, '')
  return Number(s.replace(',', '.')) * unit
}
export const formatVND = (v: unknown) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(v || 0))
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const dateKey = (v: unknown) => v ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(String(v))) : ''
export const formatDate = (v: unknown) => v ? new Date(String(v)).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'
export const displayName = (r?: Row) => String(r?.name || r?.title || r?.description || r?.code || r?.id || '—')
export const emptyDataset = (): Dataset => Object.fromEntries(collections.map(k => [k, []])) as unknown as Dataset
export function validate(entity: Entity, input: unknown): Record<string, string | number> {
  const raw = z.record(z.string(), z.unknown()).parse(input)
  const result: Record<string, string | number> = {}
  for (const field of modules[entity].fields) {
    const value = raw[field.key]
    if (value === undefined || value === null || value === '') { if (field.required) throw new Error(`Thiếu ${field.label}`); continue }
    if (field.kind === 'money' || field.kind === 'number') {
      const n = field.kind === 'money' ? parseMoney(value) : Number(value)
      if (!Number.isFinite(n) || n < 0 || (field.kind === 'money' && !Number.isSafeInteger(n)) || (['amount', 'originalAmount', 'quantityKg'].includes(field.key) && n <= 0)) throw new Error(`${field.label} không hợp lệ`)
      result[field.key] = n
    } else {
      const s = z.string().trim().max(4000).parse(value)
      if (field.required && !s) throw new Error(`Thiếu ${field.label}`)
      if (field.options && !field.options.includes(s)) throw new Error(`${field.label} không hợp lệ`)
      if (field.ref && (!/^[\w-]+$/.test(s) || s.length > 150)) throw new Error(`${field.label} không hợp lệ`)
      if (field.kind === 'date' || field.kind === 'datetime-local') {
        const d = new Date(s.length === 10 ? `${s}T00:00:00+07:00` : /Z$|[+-]\d\d:\d\d$/.test(s) ? s : `${s}:00+07:00`)
        if (!Number.isFinite(d.getTime()) || (field.kind === 'date' && dateKey(d.toISOString()) !== s.slice(0, 10))) throw new Error(`${field.label} không hợp lệ`)
        result[field.key] = d.toISOString()
      } else result[field.key] = s
    }
  }
  if (result.attachmentUrl && !/^https?:\/\//.test(String(result.attachmentUrl))) throw new Error('URL chứng từ phải là http/https')
  if (entity === 'harvests') {
    const total = Math.round(Number(result.quantityKg) * Number(result.pricePerKg))
    const paid = result.paymentStatus === 'paid' ? total : result.paymentStatus === 'unpaid' ? 0 : Number(result.paidAmount || 0)
    if (!Number.isSafeInteger(total) || paid > total || (result.paymentStatus === 'partial' && (paid <= 0 || paid >= total))) throw new Error('Số đã trả không phù hợp trạng thái thanh toán')
    if (paid < total && !result.partnerId) throw new Error('Chọn người mua để tạo công nợ')
  }
  return result
}

