// Offline contract tests execute the actual TypeScript services against a transactional
// in-memory Firestore adapter. They never connect to Firebase or read credentials.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { Timestamp } = require('firebase-admin/firestore')
let database = new Map()
let counter = 0
const clone = value => value instanceof Timestamp ? value : Array.isArray(value) ? value.map(clone) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) : value
const snapshot = (ref, state) => ({ ref, id: ref.id, exists: state.has(ref.path), data: () => clone(state.get(ref.path)), get: key => key.split('.').reduce((o, k) => o?.[k], state.get(ref.path)) })
class Ref {
  constructor(p) { this.path = p; this.id = p.split('/').at(-1) }
  collection(name) { return new Query(`${this.path}/${name}`) }
  async get() { return snapshot(this, database) }
  async set(value, options) { database.set(this.path, options?.merge ? { ...database.get(this.path), ...clone(value) } : clone(value)) }
}
class Query {
  constructor(p, filters = [], max = Infinity) { this.path = p; this.filters = filters; this.max = max }
  doc(id = `auto_${++counter}`) { return new Ref(`${this.path}/${id}`) }
  where(key, op, value) { assert.equal(op, '=='); return new Query(this.path, [...this.filters, [key, value]], this.max) }
  limit(max) { return new Query(this.path, this.filters, max) }
  read(state) { const docs = [...state.keys()].filter(p => p.startsWith(`${this.path}/`) && p.split('/').length === this.path.split('/').length + 1).map(p => snapshot(new Ref(p), state)).filter(d => this.filters.every(([k, v]) => d.get(k) === v)).slice(0, this.max); return { docs, empty: !docs.length } }
  async get() { return this.read(database) }
}
let queue = Promise.resolve()
const db = {
  collection: p => { assert.equal(p, 'demo', 'No access outside demo namespace'); return new Query(p) },
  runTransaction(callback) {
    const run = queue.then(async () => {
      const state = new Map([...database].map(([k, v]) => [k, clone(v)])); let written = false
      const tx = {
        async get(ref) { assert.equal(written, false, 'Firestore reads must precede writes'); return ref instanceof Query ? ref.read(state) : snapshot(ref, state) },
        set(ref, value, options) { written = true; assert.ok(ref.path === 'demo/chatbot' || ref.path.startsWith('demo/chatbot/')); state.set(ref.path, options?.merge ? { ...state.get(ref.path), ...clone(value) } : clone(value)); return tx },
        update(ref, value) { return tx.set(ref, value, { merge: true }) },
        delete(ref) { written = true; state.delete(ref.path); return tx },
      }
      const result = await callback(tx); database = state; return result
    })
    queue = run.catch(() => {}); return run
  },
}
const originalLoad = Module._load
Module._load = function (id, parent, main) { if (id === 'server-only') return {}; if (id === '@/lib/firebaseAdmin') return { getAdminDb: () => db }; return originalLoad.call(this, id, parent, main) }
require.extensions['.ts'] = (module, filename) => { const source = fs.readFileSync(filename, 'utf8'); module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename) }
const { mutate } = require('../_services/business.ts')
const { getDemoData } = require('../_services/repository.ts')
const { localIntent } = require('../_services/ai.ts')
const { dashboard } = require('../_services/dashboard.ts')
const { parseMoney, validate } = require('../_lib/model.ts')
const { previewImport, exportWorkbook } = require('../_services/excel.ts')
const save = async (entity, data, extra = {}) => mutate({ entity, data, operation: 'save', requestId: `request_${++counter}`, ...extra })
async function fixture() {
  database = new Map()
  const partner = await save('partners', { name: 'Minh Phú', type: 'customer', status: 'active' })
  const pond = await save('ponds', { code: 'A01', name: 'Ao A01', status: 'active' })
  const crop = await save('crops', { code: 'V3', name: 'Vụ 3', pondId: pond.id, startDate: '2026-01-01', status: 'active' })
  const category = await save('categories', { name: 'Thức ăn', type: 'expense' })
  return { partnerId: partner.id, pondId: pond.id, cropId: crop.id, categoryId: category.id }
}
const harvest = refs => ({ ...refs, harvestDate: '2026-09-10', quantityKg: 3200, pricePerKg: 145000, paymentStatus: 'partial', paidAmount: 100000000, totalAmount: 1 })
test('money and dates validate strictly', () => {
  for (const s of ['100000000', '100.000.000', '100 triệu', '100tr']) assert.equal(parseMoney(s), 100000000)
  assert.throws(() => validate('transactions', { type: 'income', amount: -1, description: 'x', transactionDate: '2026-01-01' }))
  assert.throws(() => validate('transactions', { type: 'income', amount: 100, description: 'x', transactionDate: '2026-02-30' }))
})
test('harvest recomputes total, creates actual cash and remaining debt atomically', async () => {
  const refs = await fixture(); await save('harvests', harvest(refs))
  const d = await getDemoData()
  assert.equal(d.harvests[0].totalAmount, 464000000)
  assert.equal(d.transactions[0].amount, 100000000)
  assert.equal(d.receivables[0].originalAmount, 364000000)
  assert.equal(d.harvests[0].transactionId, d.transactions[0].id)
  assert.equal(d.transactions[0].sourceId, d.harvests[0].id)
  assert.ok(database.get(`demo/chatbot/harvests/${d.harvests[0].id}`).harvestDate instanceof Timestamp)
})
test('debt payment updates cash, balance and harvest without counting revenue twice', async () => {
  const refs = await fixture(); await save('harvests', harvest(refs)); let d = await getDemoData()
  await mutate({ entity: 'receivables', id: d.receivables[0].id, operation: 'pay', amount: 64000000, requestId: 'payment_1' })
  await mutate({ entity: 'receivables', id: d.receivables[0].id, operation: 'pay', amount: 64000000, requestId: 'payment_1' })
  d = await getDemoData(); assert.equal(d.receivables[0].remainingAmount, 300000000); assert.equal(d.harvests[0].paidAmount, 164000000); assert.equal(d.transactions.length, 2); assert.equal(dashboard(d).harvest.revenue, 464000000)
  const count = database.size
  await assert.rejects(mutate({ entity: 'receivables', id: d.receivables[0].id, operation: 'pay', amount: 400000000, requestId: 'overpay' }))
  assert.equal(database.size, count)
  await assert.rejects(save('harvests', harvest(refs), { id: d.harvests[0].id }), /thu công nợ/)
})
test('harvest edits and deletes reconcile generated records', async () => {
  const refs = await fixture(); const h = await save('harvests', harvest(refs))
  await save('harvests', { ...harvest(refs), paymentStatus: 'paid' }, { id: h.id })
  let d = await getDemoData(); assert.equal(d.transactions.length, 1); assert.equal(d.transactions[0].amount, 464000000); assert.equal(d.receivables.length, 0)
  await mutate({ entity: 'harvests', id: h.id, operation: 'delete', requestId: 'delete_h' })
  d = await getDemoData(); assert.equal(d.harvests.length, 0); assert.equal(d.transactions.length, 0)
})
test('crop expense edits synchronize transaction and protect references', async () => {
  const refs = await fixture(); const input = { ...refs, amount: 100000000, description: 'Thức ăn', expenseDate: '2026-09-10' }
  const expense = await save('cropExpenses', input)
  await save('cropExpenses', { ...input, amount: 110000000 }, { id: expense.id })
  let d = await getDemoData(); assert.equal(d.transactions.length, 1); assert.equal(d.transactions[0].amount, 110000000)
  await assert.rejects(mutate({ entity: 'ponds', id: refs.pondId, operation: 'delete', requestId: 'delete_pond' }), /đang được sử dụng/)
  await assert.rejects(save('transactions', { type: 'expense', amount: 1, description: 'x', transactionDate: '2026-09-10' }, { id: d.transactions[0].id }), /chứng từ gốc/)
  const other = await save('ponds', { code: 'B01', name: 'B', status: 'active' })
  await assert.rejects(save('cropExpenses', { ...input, pondId: other.id }), /không thuộc ao/)
})
test('chat needs pending confirmation and only executes once', async () => {
  const refs = await fixture(); const input = harvest(refs)
  await getDemoCollectionForTest('chatMessages', 'message_1').set({ status: 'waiting_confirmation', actionData: { entity: 'harvests', operation: 'save' } })
  await assert.rejects(save('harvests', input, { requestId: 'confirm_1', source: 'chat' }), /cần xác nhận/)
  // Business API supplies a confirmation record; its state is checked transactionally.
  await mutate({ entity: 'harvests', operation: 'save', data: input, requestId: 'confirm_2', source: 'chat' }, { id: 'message_1' })
  await assert.rejects(mutate({ entity: 'harvests', operation: 'save', data: input, requestId: 'confirm_3', source: 'chat' }, { id: 'message_1' }), /đã được xử lý/)
})
function getDemoCollectionForTest(entity, id) { return new Ref(`demo/chatbot/${entity}/${id}`) }
test('Vietnamese parser resolves pond/crop and harvest units; query has no write intent', async () => {
  await fixture(); const d = await getDemoData()
  const i = localIntent('Thu tôm ao A1 vụ 3, 3 tấn 2, size 30, giá 145 nghìn, bán Minh Phú', d)
  assert.equal(i.intent, 'CREATE_HARVEST'); assert.equal(i.data.quantityKg, 3200); assert.equal(i.data.pricePerKg, 145000); assert.equal(i.data.cropId, d.crops[0].id); assert.equal(i.requiresConfirmation, true)
  assert.equal(localIntent('Hôm nay có việc gì?', d).requiresConfirmation, false)
})
test('import rejects invalid references and duplicate rows; Excel exports numeric money', async () => {
  const refs = await fixture()
  const rows = [{ type: 'expense', amount: 100, description: 'Test', transactionDate: '2026-09-10', partnerId: 'Missing' }]
  const mapping = Object.fromEntries(Object.keys(rows[0]).map(k => [k, k]))
  const preview = await previewImport('transactions', [...rows, ...rows], mapping)
  assert.ok(preview[0].errors.length); assert.ok(preview[1].errors.includes('Dòng trùng trong file'))
  await save('harvests', harvest(refs)); const d = await getDemoData()
  const XLSX = require('xlsx'); const book = XLSX.read(exportWorkbook(d), { type: 'buffer' }); const exported = XLSX.utils.sheet_to_json(book.Sheets.harvests)
  assert.equal(exported[0].totalAmount, 464000000); assert.equal(exported[0].partnerName, 'Minh Phú')
})
