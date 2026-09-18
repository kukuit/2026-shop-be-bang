// Runs actual services/API against an isolated transactional Firestore substitute.
// Never reads environment files, credentials, or production data.
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const assert = require('node:assert/strict')
const firestore = require('firebase-admin/firestore')
const { Timestamp } = firestore
const root = path.resolve(__dirname, '../..')
let database = new Map(), counter = 0, identity = 'alice', queue = Promise.resolve(), clock = Date.now()
const serverTime = { __serverTimestamp: true }
const deleteField = { __deleteField: true }
const clone = v => v instanceof Timestamp ? v : Array.isArray(v) ? v.map(clone) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v
const materialize = v => v?.__serverTimestamp ? Timestamp.fromMillis(++clock) : v instanceof Timestamp ? v : Array.isArray(v) ? v.map(materialize) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, materialize(x)])) : v
function snapshot(ref, state) { return { ref, id: ref.id, exists: state.has(ref.path), data: () => clone(state.get(ref.path)), get: key => state.get(ref.path)?.[key] } }
class Ref {
  constructor(p) { this.path = p; this.id = p.split('/').at(-1) }
  collection(name) { return new Query(`${this.path}/${name}`) }
  get() { return Promise.resolve(snapshot(this, database)) }
}
class Query {
  constructor(p, filters = [], max = Infinity, order = '__name__', direction = 'asc', cursor) { Object.assign(this, { path: p, filters, max, order, direction, cursor }) }
  doc(id = `auto_${++counter}`) { return new Ref(`${this.path}/${id}`) }
  where(key, op, value) { assert.equal(op, '=='); return new Query(this.path, [...this.filters, [key, value]], this.max, this.order, this.direction, this.cursor) }
  limit(max) { return new Query(this.path, this.filters, max, this.order, this.direction, this.cursor) }
  orderBy(key, direction = 'asc') { return new Query(this.path, this.filters, this.max, typeof key === 'string' ? key : '__name__', direction, this.cursor) }
  startAfter(cursor) { return new Query(this.path, this.filters, this.max, this.order, this.direction, typeof cursor === 'object' ? cursor.id : cursor) }
  read(state) {
    let docs = [...state.keys()].filter(p => p.startsWith(this.path + '/') && p.split('/').length === this.path.split('/').length + 1).map(p => snapshot(new Ref(p), state))
    const key = d => this.order === '__name__' ? d.id : d.get(this.order)
    docs = docs.filter(d => this.filters.every(([k, v]) => d.get(k) === v)).sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (this.direction === 'asc' ? 1 : -1))
    if (this.cursor !== undefined) docs = docs.filter(d => this.direction === 'asc' ? key(d) > this.cursor : key(d) < this.cursor)
    docs = docs.slice(0, this.max)
    return { docs, size: docs.length, empty: !docs.length }
  }
  get() { return Promise.resolve(this.read(database)) }
}
const db = {
  collection(p) { assert.equal(p, 'demo'); return new Query(p) },
  runTransaction(callback) {
    const work = queue.then(async () => {
      const state = new Map([...database].map(([k, v]) => [k, clone(v)]))
      let written = false
      const tx = {
        async get(ref) { assert.equal(written, false, 'Firestore reads must precede writes'); return ref instanceof Query ? ref.read(state) : snapshot(ref, state) },
        set(ref, value, options) { assert.ok(ref.path.startsWith('demo/ai-task/users/'), 'Write escaped AI Task namespace'); written = true; const data = materialize(value); const next = options?.merge ? { ...state.get(ref.path), ...data } : data; for (const key of Object.keys(next)) if (next[key]?.__deleteField) delete next[key]; state.set(ref.path, next); return tx },
        update(ref, value) { assert.ok(state.has(ref.path)); return tx.set(ref, value, { merge: true }) },
      }
      const result = await callback(tx)
      database = state
      return result
    })
    queue = work.catch(() => {})
    return work
  },
}
const originalLoad = Module._load
Module._load = function (id, parent, main) {
  if (id === 'server-only') return {}
  if (id === '@/lib/firebaseAdmin') return { getAdminDb: () => db }
  if (id === 'firebase-admin/firestore') return { ...firestore, FieldValue: { serverTimestamp: () => serverTime, delete: () => deleteField } }
  if (id === '@/lib/auth/current-user') return { requireAuth: async () => identity ? { ok: true, user: { id: identity } } : { ok: false, status: 401 } }
  if (id.startsWith('@/')) id = path.join(root, 'src', id.slice(2))
  return originalLoad.call(this, id, parent, main)
}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename)
module.exports = {
  load: name => require(path.join(root, 'src/app/demo/ai-task', name)),
  reset() { database = new Map(); counter = 0; identity = 'alice' },
  identity(value) { identity = value },
  data: () => database,
  put(p, value) { assert.ok(p.startsWith('demo/ai-task/users/')); database.set(p, value) },
}
