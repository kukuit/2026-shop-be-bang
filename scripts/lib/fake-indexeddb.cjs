const keyString = key => JSON.stringify(key)
const keyValue = (value, path) => Array.isArray(path) ? path.map(part => value?.[part]) : value?.[path]

class KeyRange {
  constructor(value) { this.lower = value; this.upper = value }
  static only(value) { return new KeyRange(value) }
}

class NameList extends Array {
  contains(value) { return this.includes(value) }
}

class FakeRequest {}

class FakeDatabase {
  constructor(name) { this.name = name; this.stores = new Map(); this.objectStoreNames = new NameList() }
  createObjectStore(name, options) {
    const definition = { keyPath: options.keyPath, indexes: new Map(), records: new Map() }
    this.stores.set(name, definition); this.objectStoreNames.push(name)
    return new FakeObjectStore(this, null, name, definition, true)
  }
  transaction(names, mode = 'readonly') { return new FakeTransaction(this, Array.isArray(names) ? names : [names], mode) }
  close() {}
}

class FakeTransaction {
  constructor(database, names, mode) {
    this.db = database; this.mode = mode; this.names = names; this.views = new Map(); this.pending = 0; this.finished = false
    for (const name of names) {
      const definition = database.stores.get(name)
      this.views.set(name, { ...definition, indexes: definition.indexes, records: new Map(definition.records) })
    }
  }
  objectStore(name) {
    if (!this.views.has(name)) throw new Error(`Store ${name} is not in this transaction`)
    return new FakeObjectStore(this.db, this, name, this.views.get(name), false)
  }
  queue(resultFactory, request = new FakeRequest()) {
    this.pending++
    setTimeout(() => {
      if (this.finished) return
      try { request.result = resultFactory(); request.onsuccess?.({ target: request }) }
      catch (error) { request.error = error; request.onerror?.({ target: request }) }
      this.pending--
      this.finishWhenIdle()
    }, 0)
    return request
  }
  finishWhenIdle() {
    if (this.pending || this.finished) return
    setTimeout(() => {
      if (this.pending || this.finished) return
      this.finished = true
      if (this.mode === 'readwrite') for (const [name, view] of this.views) this.db.stores.get(name).records = view.records
      this.oncomplete?.({ target: this })
    }, 0)
  }
  abort() {
    if (this.finished) return
    this.finished = true
    setTimeout(() => this.onabort?.({ target: this }), 0)
  }
}

class FakeObjectStore {
  constructor(database, transaction, name, definition, upgrading) { Object.assign(this, { db: database, tx: transaction, name, definition, upgrading }) }
  get indexNames() { return new NameList(...this.definition.indexes.keys()) }
  createIndex(name, keyPath, options = {}) { this.definition.indexes.set(name, { keyPath, unique: options.unique || false }); return this.index(name) }
  get keyPath() { return this.definition.keyPath }
  index(name) {
    const index = this.definition.indexes.get(name)
    if (!index) throw new Error(`Unknown index ${name} on ${this.name}`)
    return new FakeIndex(this, name, index)
  }
  extractKey(value) { return keyValue(value, this.keyPath) }
  records() { return this.definition.records }
  get(key) { return this.tx.queue(() => this.records().get(keyString(key))) }
  getAll(query) { return this.tx.queue(() => [...this.records().values()].filter(value => !query || matches(keyValue(value, this.keyPath), query))) }
  count(query) { return this.tx.queue(() => [...this.records().values()].filter(value => !query || matches(keyValue(value, this.keyPath), query)).length) }
  put(value) {
    if (this.tx.mode !== 'readwrite') throw new Error('Readonly transaction')
    this.records().set(keyString(this.extractKey(value)), value)
    return this.tx.queue(() => this.extractKey(value))
  }
  add(value) {
    if (this.tx.mode !== 'readwrite') throw new Error('Readonly transaction')
    const key = keyString(this.extractKey(value))
    if (this.records().has(key)) throw new Error('ConstraintError')
    this.records().set(key, value)
    return this.tx.queue(() => this.extractKey(value))
  }
  delete(key) {
    if (this.tx.mode !== 'readwrite') throw new Error('Readonly transaction')
    this.records().delete(keyString(key))
    return this.tx.queue(() => undefined)
  }
}

class FakeIndex {
  constructor(store, name, definition) { Object.assign(this, { store, name, definition }) }
  key(value) { return keyValue(value, this.definition.keyPath) }
  values(query) { return [...this.store.records().values()].filter(value => !query || matches(this.key(value), query)) }
  getAll(query) { return this.store.tx.queue(() => this.values(query)) }
  count(query) { return this.store.tx.queue(() => this.values(query).length) }
  openKeyCursor(query) {
    const request = new FakeRequest()
    const rows = [...this.store.records().entries()].filter(([, value]) => !query || matches(this.key(value), query))
    let cursorIndex = 0
    const emit = () => {
      if (this.store.tx.finished) return
      if (cursorIndex >= rows.length) request.result = null
      else {
        const [primaryKey] = rows[cursorIndex]
        const originalKey = this.store.extractKey(this.store.records().get(primaryKey))
        request.result = { primaryKey: originalKey, key: this.key(this.store.records().get(primaryKey)), continue: () => { cursorIndex++; this.store.tx.pending++; setTimeout(() => { request.onsuccess?.({ target: request }); this.store.tx.pending--; this.store.tx.finishWhenIdle() }, 0) } }
      }
      request.onsuccess?.({ target: request })
    }
    this.store.tx.pending++
    setTimeout(() => { emit(); this.store.tx.pending--; this.store.tx.finishWhenIdle() }, 0)
    return request
  }
}

function matches(key, range) {
  if (range == null) return true
  if (Array.isArray(range.lower) || Array.isArray(key)) return keyString(key) === keyString(range.lower) && keyString(key) === keyString(range.upper)
  return key >= range.lower && key <= range.upper
}

class FakeIndexedDB {
  constructor() { this.databases = new Map() }
  open(name) {
    const request = new FakeRequest()
    setTimeout(() => {
      let database = this.databases.get(name)
      const upgrade = !database
      if (!database) { database = new FakeDatabase(name); this.databases.set(name, database) }
      request.result = database
      if (upgrade) {
        request.transaction = new FakeTransaction(database, [], 'readwrite')
        request.onupgradeneeded?.({ target: request })
      }
      request.onsuccess?.({ target: request })
    }, 0)
    return request
  }
  clear() { for (const database of this.databases.values()) for (const store of database.stores.values()) store.records.clear() }
}

module.exports = { FakeIndexedDB, KeyRange }
