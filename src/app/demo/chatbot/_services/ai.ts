import 'server-only'
import { z } from 'zod'
import { Dataset, Entity, normalize, parseMoney, today, entities, modules } from '../_lib/model'

export const chatbotActions = {
  CREATE_TASK: 'tasks', CREATE_PARTNER: 'partners', CREATE_POND: 'ponds', CREATE_CROP: 'crops', CREATE_TRANSACTION: 'transactions', CREATE_CROP_EXPENSE: 'cropExpenses', CREATE_HARVEST: 'harvests', CREATE_RECEIVABLE: 'receivables', CREATE_PAYABLE: 'payables',
  GET_TODAY_TASKS: null, GET_FINANCE: null, GET_PARTNER_DEBT: null, GET_PONDS: null, GET_PROFIT: null, GET_HARVESTS: null,
} as const
export type Intent = { intent: keyof typeof chatbotActions; confidence: number; requiresConfirmation: boolean; data: Record<string, any> }
function match(d: Dataset, entity: Entity, text: string) { const matches = d[entity].filter(r => [r.name, r.code].some(n => n && text.includes(normalize(String(n))))); return matches.length === 1 ? matches[0] : undefined }
export function localIntent(text: string, d: Dataset): Intent | null {
  const t = normalize(text)
  const partner = match(d, 'partners', t)
  const pondToken = t.match(/ao\s*([a-z])0*(\d+)/)
  const pondMatches = pondToken ? d.ponds.filter(p => normalize(String(p.code)).replace(/([a-z])0+(\d)/, '$1$2') === `${pondToken[1]}${Number(pondToken[2])}`) : []
  const pond = pondMatches.length === 1 ? pondMatches[0] : match(d, 'ponds', t)
  const cropToken = t.match(/vu\s*0*(\d+)/)
  const cropMatches = d.crops.filter(c => c.pondId === pond?.id && cropToken && new RegExp(`(?:vu\\s*|^)0*${Number(cropToken[1])}(?:\\D|$)`).test(normalize(String(c.name))))
  const crop = cropMatches.length === 1 ? cropMatches[0] : undefined
  const category = match(d, 'categories', t)
  const base = { partnerId: partner?.id || '', pondId: pond?.id || '', cropId: crop?.id || '', categoryId: category?.id || '' }
  const query = (intent: Intent['intent']): Intent => ({ intent, confidence: 0.9, requiresConfirmation: false, data: { ...base, period: t.includes('thang') ? 'month' : 'today', unresolvedPartner: !partner && /no|cong no/.test(t), unresolvedScope: Boolean(pondToken && !pond || cropToken && !crop) } })
  if (/nhac|tao viec/.test(t)) {
    const day = new Date(`${today()}T00:00:00+07:00`); if (/mai/.test(t)) day.setDate(day.getDate() + 1)
    const hour = Number(t.match(/(\d{1,2})\s*gio/)?.[1] || 8)
    day.setTime(day.getTime() + hour * 3600000)
    return { intent: 'CREATE_TASK', confidence: 0.8, requiresConfirmation: true, data: { title: text, description: text, dueAt: day.toISOString(), remindAt: day.toISOString(), status: 'pending', priority: 'normal', ...base } }
  }
  if (/viec gi|cong viec|viec hom nay/.test(t)) return query('GET_TODAY_TASKS')
  if (/loi|loi nhuan|lai bao/.test(t)) return query('GET_PROFIT')
  if (/cong no|con no|no bao/.test(t)) return query('GET_PARTNER_DEBT')
  if (/ao nao|dang nuoi/.test(t)) return query('GET_PONDS')
  if (/thu tom|thu hoach/.test(t) && !/\d+\s*(tan|kg)/.test(t)) return query('GET_HARVESTS')
  if (/bao nhieu|tinh hinh|tong ket/.test(t)) return query('GET_FINANCE')
  const qty = t.match(/(\d+(?:[.,]\d+)?)\s*(tan|kg)(?:\s*(\d))?/)
  if (qty && /thu|ban/.test(t)) {
    const price = t.match(/gia\s*([\d.,]+\s*(?:nghin|ngan|k|trieu|tr)?)/)
    return { intent: 'CREATE_HARVEST', confidence: 0.8, requiresConfirmation: true, data: { ...base, harvestDate: today(), quantityKg: Number(qty[1].replace(',', '.')) * (qty[2] === 'tan' ? 1000 : 1) + (qty[2] === 'tan' ? Number(qty[3] || 0) * 100 : 0), pricePerKg: price ? parseMoney(price[1]) : '', shrimpSize: Number(t.match(/size\s*(\d+)/)?.[1] || 0), paymentStatus: /da tra|da thanh toan/.test(t) ? 'paid' : 'unpaid', note: text } }
  }
  const amount = t.match(/(\d[\d.,]*\s*(?:trieu|tr|ty|nghin|ngan|k))\b/)
  if (amount && (/chi|thu|tien/.test(t) || partner)) return { intent: crop || pondToken ? 'CREATE_CROP_EXPENSE' : 'CREATE_TRANSACTION', confidence: 0.75, requiresConfirmation: true, data: { ...base, type: /^thu\b/.test(t) ? 'income' : 'expense', amount: parseMoney(amount[1]), description: text, transactionDate: today(), expenseDate: today() } }
  return null
}
// Separate provider adapter; only structured intents are returned, never database queries.
export async function parseIntent(text: string, d: Dataset): Promise<Intent | null> {
  const local = localIntent(text, d)
  if (local) return local
  const provider = process.env.CHAT_PROVIDER || 'groq'
  const key = provider === 'openai' ? process.env.OPENAI_API_KEY : provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.GROQ_API_KEY
  if (!key) return null
  const prompt = `Bạn chỉ phân tích yêu cầu quản lý nuôi tôm thành JSON {intent,confidence,data}. Actions: ${JSON.stringify(chatbotActions)}. Schema: ${JSON.stringify(Object.fromEntries(entities.map(e => [e, modules[e].fields])))}. Chỉ dùng ID có trong danh sách, thiếu thì để trống. Không bịa số liệu. Ngày hiện tại ${today()}, múi giờ +07. Tham chiếu: ${JSON.stringify({ partners: d.partners, ponds: d.ponds, crops: d.crops, categories: d.categories })}. Không phù hợp trả null. Chỉ JSON.`
  const anthropic = provider === 'anthropic'
  const url = anthropic ? 'https://api.anthropic.com/v1/messages' : provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions'
  const model = anthropic ? process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest' : provider === 'openai' ? process.env.OPENAI_MODEL || 'gpt-4o-mini' : process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
  const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(25000), headers: anthropic ? { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' } : { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(anthropic ? { model, system: prompt, messages: [{ role: 'user', content: text }], max_tokens: 1200 } : { model, messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }], temperature: 0, max_tokens: 1200 }) })
  if (!response.ok) throw new Error('AI chưa phản hồi. Bạn có thể tiếp tục nhập bằng form.')
  const json = await response.json()
  const content = anthropic ? json.content?.find((c: { type: string }) => c.type === 'text')?.text : json.choices?.[0]?.message?.content
  try {
    const parsed = z.object({ intent: z.enum(Object.keys(chatbotActions) as [Intent['intent'], ...Intent['intent'][]]), confidence: z.number().min(0).max(1), data: z.record(z.string(), z.any()) }).parse(JSON.parse(String(content).replace(/^```json\s*|```$/g, '')))
    return { ...parsed, requiresConfirmation: chatbotActions[parsed.intent] !== null }
  } catch { return null }
}
