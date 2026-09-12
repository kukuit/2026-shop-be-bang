const { Timestamp } = require('firebase-admin/firestore')

module.exports = function firestoreMock(seed = {}) {
  const documents = new Map(Object.entries(seed))
  const reads = [], writes = []
  let failWrites = false
  const resolve = value => {
    if (value?.__timestamp) return Timestamp.fromMillis(1700000000000)
    if (value instanceof Timestamp) return value
    if (Array.isArray(value)) return value.map(resolve)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item)]))
    return value
  }
  const valueOf = value => value instanceof Timestamp ? value.seconds * 1e9 + value.nanoseconds : value
  const snap = (path, data) => ({ id: path.split('/').at(-1), ref: ref(path), exists: !!data, data: () => data })
  function ref(path) {
    return { path, collection: id => query(`${path}/${id}`),
      get: async () => { reads.push({ path }); return snap(path, documents.get(path)) },
    }
  }
  function query(path, state = { filters: [], orders: [], fields: null, limit: Infinity, after: null }) {
    const next = change => query(path, { ...state, ...change })
    return {
      path, doc: id => ref(`${path}/${id}`),
      where: (key, op, value) => next({ filters: [...state.filters, { key, op, value }] }),
      orderBy: (key, direction = 'asc') => next({ orders: [...state.orders, { key, direction }] }),
      limit: limit => next({ limit }), select: (...fields) => next({ fields }),
      startAfter: (...values) => next({ after: values }),
      async get() {
        reads.push({ path, ...state })
        let rows = Array.from(documents).filter(([key]) => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/'))
        rows = rows.filter(([, data]) => state.filters.every(({key, value}) => data[key] === value))
        const getValue = ([key, data], field) => field === '__name__' ? key.split('/').at(-1) : valueOf(data[field])
        rows.sort((a, b) => {
          for (const {key, direction} of state.orders) {
            const av = getValue(a, key), bv = getValue(b, key)
            if (av !== bv) return (av < bv ? -1 : 1) * (direction === 'desc' ? -1 : 1)
          }
          return 0
        })
        if (state.after) rows = rows.filter(row => {
          for (let i = 0; i < state.orders.length; i++) {
            const {key, direction} = state.orders[i]
            const raw = state.after[0]?.ref ? state.after[0].id : state.after[i]
            const av = getValue(row, key), bv = valueOf(raw)
            if (av !== bv) return direction === 'desc' ? av < bv : av > bv
          }
          return false
        })
        rows = rows.slice(0, state.limit)
        const docs = rows.map(([key, data]) => snap(key, state.fields ? Object.fromEntries(state.fields.filter(field => field in data).map(field => [field, data[field]])) : data))
        return { docs, size: docs.length, empty: !docs.length }
      },
    }
  }
  const db = {
    collection: id => query(id),
    async runTransaction(fn) {
      const pending = []
      const transaction = {
        get: async reference => { if (pending.length) throw new Error('Read after write'); return reference.get() },
        getAll: (...refs) => Promise.all(refs.map(reference => transaction.get(reference))),
        create: (reference, data) => { if (documents.has(reference.path)) throw new Error('Already exists'); pending.push({ reference, data }) },
        set: (reference, data, options) => pending.push({ reference, data, options }),
      }
      const result = await fn(transaction)
      if (failWrites && pending.length) throw new Error('Simulated commit failure')
      for (const {reference, data, options} of pending) {
        documents.set(reference.path, options?.merge ? { ...documents.get(reference.path), ...resolve(data) } : resolve(data))
        writes.push(reference.path)
      }
      return result
    },
  }
  return { db, documents, reads, writes, setFailWrites: value => { failWrites = value },
    firestore: { Timestamp, FieldPath: { documentId: () => '__name__' }, FieldValue: { serverTimestamp: () => ({ __timestamp: true }) } },
  }
}
