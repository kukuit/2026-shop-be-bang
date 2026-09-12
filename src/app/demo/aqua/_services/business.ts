import 'server-only'
import { Timestamp, Transaction as FireTransaction } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { Collection, Entity, entities, modules, normalize, validate, collections } from '../_lib/model'
import { getDemoCollection, getDemoRoot, serialize, timestamps } from './repository'

export type Mutation = { entity: Entity; id?: string; operation: 'save' | 'delete' | 'pay'; data?: unknown; amount?: number; source?: 'form' | 'chat' | 'voice' | 'import'; requestId: string; expectedGeneration?: number }
const assertId = (id: string) => { if (!/^[\w-]{1,150}$/.test(id)) throw new Error('ID không hợp lệ') }
function audit(tx: FireTransaction, entity: Collection, id: string, action: string, before: unknown, after: unknown, source: string) {
  tx.set(getDemoCollection('auditLogs').doc(), { entityType: entity, entityId: id, action, before: before || null, after: after || null, source, createdAt: Timestamp.now(), createdBy: null })
}
// Every mutation reads this lock first. Referential checks and reset cannot race writes.
export async function mutate(input: Mutation, confirmation?: { id: string }) {
  if (!entities.includes(input.entity)) throw new Error('Module không hợp lệ')
  assertId(input.requestId)
  const id = input.id || getDemoCollection(input.entity).doc().id
  assertId(id)
  const source = input.source || 'form'
  if (['chat', 'voice'].includes(source) && !confirmation) throw new Error('Chat cần xác nhận trước khi lưu')
  return getAdminDb().runTransaction(async tx => {
    const lock = getDemoRoot()
    const lockData = await tx.get(lock)
    if (lockData.get('resetting')) throw new Error('Đang reset dữ liệu, vui lòng thử lại sau')
    if (input.expectedGeneration !== undefined && Number(lockData.get('generation') || 0) !== input.expectedGeneration) throw new Error('Dữ liệu đã được reset. Vui lòng bắt đầu lại.')
    const receipt = getDemoCollection('settings').doc(`request_${input.requestId}`)
    const previous = await tx.get(receipt)
    if (previous.exists) return previous.get('result') as { id: string }
    let messageRef
    if (confirmation) {
      assertId(confirmation.id)
      messageRef = getDemoCollection('chatMessages').doc(confirmation.id)
      const msg = await tx.get(messageRef)
      if (msg.get('status') !== 'waiting_confirmation') throw new Error('Yêu cầu đã được xử lý hoặc hủy')
      if (msg.get('actionData.entity') !== input.entity || msg.get('actionData.operation') !== input.operation || (msg.get('actionData.id') || '') !== (input.id || '')) throw new Error('Hành động xác nhận không khớp')
    }
    const ref = getDemoCollection(input.entity).doc(id)
    const snapshot = await tx.get(ref)
    const before = snapshot.exists ? snapshot.data()! : null
    if (input.id && !before) throw new Error('Bản ghi không còn tồn tại')
    if (before?.sourceType && before.sourceType !== 'manual') throw new Error('Bản ghi liên kết: chỉnh sửa tại chứng từ gốc')
    const now = Timestamp.now()
    let after: Record<string, any> | null = null
    const changes: { entity: Collection; id: string; data: Record<string, any> | null; before?: unknown }[] = []
    const oldLinks: { entity: Collection; id: string; data: Record<string, any> }[] = []
    for (const [field, entity] of [['transactionId', 'transactions'], ['receivableId', 'receivables']] as const) {
      if (before?.[field] && ['harvests', 'cropExpenses'].includes(input.entity)) {
        const linked = await tx.get(getDemoCollection(entity).doc(before[field]))
        if (linked.exists) oldLinks.push({ entity, id: linked.id, data: linked.data()! })
      }
    }
    if (oldLinks.some(l => l.entity === 'receivables' && l.data.paidAmount > 0)) throw new Error('Thu hoạch đã thu công nợ; không thể sửa/xóa chứng từ gốc')
    if (input.operation === 'pay') {
      if (!before || !['receivables', 'payables'].includes(input.entity)) throw new Error('Công nợ không hợp lệ')
      const amount = input.amount
      if (!amount || !Number.isSafeInteger(amount) || amount <= 0 || amount > before.remainingAmount) throw new Error('Số thanh toán phải lớn hơn 0 và không vượt nợ còn lại')
      const paidAmount = before.paidAmount + amount
      after = { ...before, paidAmount, remainingAmount: before.originalAmount - paidAmount, status: paidAmount === before.originalAmount ? 'paid' : 'partial', updatedAt: now }
      changes.push({ entity: 'transactions', id: getDemoCollection('transactions').doc().id, data: { type: input.entity === 'receivables' ? 'income' : 'expense', amount, partnerId: before.partnerId, pondId: before.pondId || '', cropId: before.cropId || '', description: `Thanh toán: ${before.description}`, transactionDate: now, sourceType: 'debt_payment', sourceId: id, debtType: input.entity, paymentStatus: 'paid' } })
      if (before.harvestId) {
        const h = await tx.get(getDemoCollection('harvests').doc(before.harvestId))
        if (!h.exists) throw new Error('Không tìm thấy thu hoạch gốc')
        const hData = h.data()!
        const hPaid = hData.paidAmount + amount
        changes.push({ entity: 'harvests', id: h.id, before: hData, data: { ...hData, paidAmount: hPaid, paymentStatus: hPaid === hData.totalAmount ? 'paid' : 'partial' } })
      }
    } else if (input.operation === 'delete') {
      if (!before) throw new Error('Không tìm thấy bản ghi')
      if (before.harvestId || (['receivables', 'payables'].includes(input.entity) && before.paidAmount > 0)) throw new Error('Công nợ đã liên kết/thanh toán không thể xóa')
      const key = ({ partners: 'partnerId', ponds: 'pondId', crops: 'cropId', categories: 'categoryId', transactions: 'transactionId' } as Record<string, string>)[input.entity]
      if (key) for (const entity of entities) {
        const linked = await tx.get(getDemoCollection(entity).where(key, '==', id).limit(1))
        if (!linked.empty) throw new Error('Bản ghi đang được sử dụng. Hãy chuyển sang ngừng hoạt động hoặc xử lý liên kết trước.')
      }
    } else if (input.operation === 'save') {
      if (before?.harvestId) throw new Error('Chỉnh sửa công nợ tại thu hoạch gốc')
      const data = validate(input.entity, input.data)
      for (const field of modules[input.entity].fields.filter(f => f.ref && data[f.key])) {
        const linked = await tx.get(getDemoCollection(field.ref!).doc(String(data[field.key])))
        if (!linked.exists) throw new Error(`${field.label} không tồn tại`)
        if (field.key === 'cropId' && data.pondId && linked.get('pondId') !== data.pondId) throw new Error('Vụ nuôi không thuộc ao đã chọn')
        if (field.key === 'categoryId' && input.entity === 'cropExpenses' && linked.get('type') !== 'expense') throw new Error('Chi phí phải chọn danh mục chi')
        if (field.key === 'categoryId' && input.entity === 'transactions' && linked.get('type') !== data.type) throw new Error('Danh mục không đúng loại thu/chi')
      }
      if (data.code) {
        const same = await tx.get(getDemoCollection(input.entity).where('code', '==', data.code))
        if (same.docs.some(d => d.id !== id && (input.entity !== 'crops' || d.get('pondId') === data.pondId))) throw new Error('Mã đã tồn tại')
      }
      after = { ...timestamps(data), createdAt: before?.createdAt || now, updatedAt: now, ownerId: null, createdBy: null }
      if (input.entity === 'partners') after.normalizedName = normalize(String(data.name))
      if (input.entity === 'transactions') Object.assign(after, { sourceType: 'manual', paymentStatus: 'paid' })
      if (input.entity === 'tasks') after.completedAt = data.status === 'completed' ? before?.completedAt || now : null
      if (input.entity === 'crops' && data.endDate && String(data.endDate) < String(data.startDate)) throw new Error('Ngày kết thúc phải sau ngày bắt đầu')
      if (['receivables', 'payables'].includes(input.entity)) {
        const paid = Number(before?.paidAmount || 0)
        if (Number(data.originalAmount) < paid) throw new Error('Nợ gốc không được nhỏ hơn số đã thanh toán')
        Object.assign(after, { paidAmount: paid, remainingAmount: Number(data.originalAmount) - paid, status: Number(data.originalAmount) === paid ? 'paid' : paid ? 'partial' : 'unpaid' })
      }
      if (input.entity === 'cropExpenses') {
        after.transactionId = before?.transactionId || getDemoCollection('transactions').doc().id
        changes.push({ entity: 'transactions', id: after.transactionId, data: { ...after, type: 'expense', sourceType: 'crop_expense', sourceId: id, transactionDate: after.expenseDate, paymentStatus: 'paid' } })
      }
      if (input.entity === 'harvests') {
        const total = Math.round(Number(data.quantityKg) * Number(data.pricePerKg))
        if (!Number.isSafeInteger(total)) throw new Error('Tổng tiền vượt giới hạn')
        const paid = data.paymentStatus === 'paid' ? total : data.paymentStatus === 'unpaid' ? 0 : Number(data.paidAmount || 0)
        if (paid > total || (data.paymentStatus === 'partial' && (paid <= 0 || paid >= total))) throw new Error('Số đã trả không phù hợp trạng thái thanh toán')
        if (paid < total && !data.partnerId) throw new Error('Chọn người mua để tạo công nợ')
        Object.assign(after, { totalAmount: total, paidAmount: paid })
        if (paid > 0) {
          after.transactionId = before?.transactionId || getDemoCollection('transactions').doc().id
          changes.push({ entity: 'transactions', id: after.transactionId, data: { type: 'income', amount: paid, description: 'Thu hoạch tôm', partnerId: data.partnerId || '', pondId: data.pondId, cropId: data.cropId, transactionDate: after.harvestDate, sourceType: 'harvest', sourceId: id, paymentStatus: 'paid' } })
        }
        if (paid < total) {
          after.receivableId = before?.receivableId || getDemoCollection('receivables').doc().id
          changes.push({ entity: 'receivables', id: after.receivableId, data: { partnerId: data.partnerId, pondId: data.pondId, cropId: data.cropId, harvestId: id, originalAmount: total - paid, paidAmount: 0, remainingAmount: total - paid, description: 'Công nợ thu hoạch tôm', status: 'unpaid' } })
        }
      }
    } else throw new Error('Thao tác không hợp lệ')
    // All reads precede every write in this transaction.
    for (const link of oldLinks) if (!changes.some(c => c.entity === link.entity && c.id === link.id)) changes.push({ ...link, before: link.data, data: null })
    if (input.entity === 'tasks') changes.push({ entity: 'reminders', id, data: after?.remindAt && !['completed', 'cancelled'].includes(after.status) ? { taskId: id, title: after.title, remindAt: after.remindAt, status: 'pending' } : null })
    for (const change of changes) {
      const target = getDemoCollection(change.entity).doc(change.id)
      if (change.data) tx.set(target, { ...change.data, createdAt: change.data.createdAt || now, updatedAt: now, ownerId: null, createdBy: null })
      else tx.delete(target)
      audit(tx, change.entity, change.id, change.data ? 'save' : 'delete', change.before || oldLinks.find(l => l.entity === change.entity && l.id === change.id)?.data, change.data, source)
    }
    if (after) tx.set(ref, after); else tx.delete(ref)
    audit(tx, input.entity, id, input.operation === 'delete' ? 'delete' : before ? 'update' : 'create', before, after, source)
    if (messageRef) tx.update(messageRef, { status: 'confirmed', confirmedAt: now, actionData: { entity: input.entity, operation: input.operation, data: serialize(after), source } })
    tx.set(receipt, { result: { id }, createdAt: now })
    tx.set(lock, { revision: Number(lockData.get('revision') || 0) + 1 }, { merge: true })
    return { id }
  })
}

export async function resetDemo(confirmation: string) {
  if (confirmation !== 'RESET DEMO') throw new Error('Nhập RESET DEMO để xác nhận')
  const db = getAdminDb()
  await db.runTransaction(async tx => { const root = await tx.get(getDemoRoot()); if (root.get('resetting')) throw new Error('Đang reset'); tx.set(getDemoRoot(), { resetting: true, generation: Number(root.get('generation') || 0) + 1 }, { merge: true }) })
  try {
    for (const entity of collections) {
      for (;;) {
        const snapshot = await getDemoCollection(entity).limit(400).get()
        if (snapshot.empty) break
        const batch = db.batch(); snapshot.docs.forEach(d => batch.delete(d.ref)); await batch.commit()
      }
    }
  } finally { await getDemoRoot().set({ resetting: false, revision: Date.now() }, { merge: true }) }
}

export { serialize }
