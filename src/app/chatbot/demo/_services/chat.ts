import 'server-only'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { Timestamp } from 'firebase-admin/firestore'
import { getDemoCollection, getDemoData, getDemoRoot } from './repository'
import { parseIntent, chatbotActions } from './ai'
import { dashboard, sum } from './dashboard'
import { dateKey, today, formatVND, displayName, formatDate } from '../_lib/model'

export async function chat(text: string, source: 'chat' | 'voice') {
  if (!text.trim() || text.length > 4000) throw new Error('Nội dung phải từ 1 đến 4000 ký tự')
  const data = await getDemoData()
  const intent = await parseIntent(text, data)
  let content = 'Tôi chưa hiểu đủ yêu cầu. Bạn có thể nhập bằng form hoặc thử: “Chi 100 triệu Tấn Thành tiền thức ăn ao A01 vụ 1”.'
  let actionData: Record<string, unknown> | null = null
  if (intent) {
    const entity = chatbotActions[intent.intent]
    if (entity) {
      actionData = { entity, operation: 'save', data: intent.data, source }
      content = 'Kiểm tra và bổ sung các trường còn thiếu, sau đó xác nhận để lưu.'
    } else {
      const s = dashboard(data)
      const { partnerId, pondId, cropId, period, unresolvedPartner, unresolvedScope } = intent.data
      const missingRef = (partnerId && !data.partners.some(p => p.id === partnerId)) || (pondId && !data.ponds.some(p => p.id === pondId)) || (cropId && !data.crops.some(p => p.id === cropId))
      if (unresolvedPartner || unresolvedScope || missingRef) content = 'Chưa xác định được đúng đối tác/ao/vụ. Vui lòng dùng tên hoặc mã chính xác trong danh sách.'
      else if (intent.intent === 'GET_TODAY_TASKS') content = data.tasks.filter(t => dateKey(t.dueAt) === today() && !['completed', 'cancelled'].includes(String(t.status))).map(t => `${formatDate(t.dueAt)} · ${t.title}`).join('\n') || 'Hôm nay không có công việc đang chờ.'
      else if (intent.intent === 'GET_PARTNER_DEBT') { const filter = (r: { [key: string]: unknown }) => !partnerId || r.partnerId === partnerId; content = `${partnerId ? displayName(data.partners.find(p => p.id === partnerId)) : 'Tất cả đối tác'}\nPhải thu: ${formatVND(sum(data.receivables.filter(filter), 'remainingAmount'))}\nPhải trả: ${formatVND(sum(data.payables.filter(filter), 'remainingAmount'))}` }
      else if (intent.intent === 'GET_PONDS') content = s.active.map(c => `${displayName(data.ponds.find(p => p.id === c.pondId))} · ${displayName(c)}`).join('\n') || 'Chưa có vụ đang nuôi.'
      else if (intent.intent === 'GET_PROFIT') { const rows = cropId ? s.crops.filter(c => c.id === cropId) : pondId ? s.ponds.filter(p => p.id === pondId) : s.crops; content = rows.map(r => `${r.name}\nDoanh thu: ${formatVND(r.revenue)} · Chi phí: ${formatVND(r.expense)} · Lợi nhuận: ${formatVND(r.profit)}`).join('\n\n') || 'Chưa có dữ liệu vụ nuôi.' }
      else if (intent.intent === 'GET_HARVESTS') { const rows = data.harvests.filter(h => period === 'month' ? dateKey(h.harvestDate).slice(0, 7) === today().slice(0, 7) : dateKey(h.harvestDate) === today()); content = `Thu hoạch ${period === 'month' ? 'tháng này' : 'hôm nay'}: ${sum(rows, 'quantityKg').toLocaleString('vi-VN')} kg\nDoanh thu: ${formatVND(sum(rows, 'totalAmount'))}` }
      else { const f = period === 'month' ? s.month : s.today; content = `${period === 'month' ? 'Tháng này' : 'Hôm nay'}\nThu: ${formatVND(f.income)}\nChi: ${formatVND(f.expense)}\nDòng tiền: ${formatVND(f.cashflow)}\nPhải thu: ${formatVND(s.debts.receivables)}\nPhải trả: ${formatVND(s.debts.payables)}\nViệc hoàn thành: ${s.tasks.completed}` }
    }
  }
  const reply = getDemoCollection('chatMessages').doc()
  await getAdminDb().runTransaction(async tx => {
    const root = await tx.get(getDemoRoot()); if (root.get('resetting')) throw new Error('Đang reset demo')
    tx.set(getDemoCollection('chatMessages').doc(), { role: 'user', content: text, source, status: 'normal', createdAt: Timestamp.now() })
    tx.set(reply, { role: 'assistant', content, intent: intent?.intent || null, actionData, status: actionData ? 'waiting_confirmation' : 'normal', createdAt: Timestamp.now() })
    tx.set(getDemoRoot(), { revision: Number(root.get('revision') || 0) + 1 }, { merge: true })
  })
  return { id: reply.id, content, actionData }
}

export async function clearChat() {
  await getAdminDb().runTransaction(async tx => { const root = await tx.get(getDemoRoot()); if (root.get('resetting')) throw new Error('Đang reset'); const docs = await tx.get(getDemoCollection('chatMessages').limit(400)); docs.docs.forEach(d => tx.delete(d.ref)); tx.set(getDemoRoot(), { revision: Number(root.get('revision') || 0) + 1 }, { merge: true }) })
  if (!(await getDemoCollection('chatMessages').limit(1).get()).empty) await clearChat()
}

export async function cancelChat(id: string) {
  if (!/^[\w-]{1,150}$/.test(id)) throw new Error('ID không hợp lệ')
  await getAdminDb().runTransaction(async tx => { const ref = getDemoCollection('chatMessages').doc(id); const row = await tx.get(ref); if (row.get('status') !== 'waiting_confirmation') throw new Error('Yêu cầu đã xử lý'); tx.update(ref, { status: 'cancelled' }) })
}

