const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Small script-only loader: shares the application's pure TS logic without maintaining a second implementation.
module.exports = function createLoader(mocks = {}) {
  const cache = new Map()
  const root = path.resolve(__dirname, '../..')
  function load(filename) {
    filename = path.resolve(root, filename)
    if (!path.extname(filename)) filename += '.ts'
    const alias = '@/' + path.relative(path.join(root, 'src'), filename).replace(/\\/g, '/').replace(/\.tsx?$/, '')
    if (alias in mocks) return mocks[alias]
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    const localRequire = name => {
      if (name in mocks) return mocks[name]
      if (name === 'server-only') return {}
      if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2)))
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name))
      return require(name)
    }
    new Function('require', 'module', 'exports', source)(localRequire, module, module.exports)
    return module.exports
  }
  return load
}
