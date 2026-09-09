const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')

// Load these pure TypeScript data helpers without introducing a test dependency.
const root = path.resolve(__dirname, '../src/components/games/lesson-map')
const cache = new Map()
function load(name) {
  if (cache.has(name)) return cache.get(name)
  const source = fs.readFileSync(path.join(root, `${name}.ts`), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(id => load(id.replace('./', '')), module, module.exports)
  cache.set(name, module.exports)
  return module.exports
}
const { buildLessonMapData, getMapPosition, lessonDefinitions, demoProgress } = load('data')
const { englishUnitDefinitions, demoEnglishProgress, buildEnglishUnitMapData } = load('englishData')
const units = buildEnglishUnitMapData(englishUnitDefinitions, demoEnglishProgress)
assert.equal(units.length, 16)
assert.deepEqual(units.slice(0, 3).map(item => [item.status, item.stars]), [['completed', 3], ['completed', 3], ['current', 2]])
assert.ok(units.slice(3).every(item => item.status === 'locked'))
assert.ok(englishUnitDefinitions.every((item, index) => item.href.endsWith(`/bai-${index + 1}`) && !('status' in item)))
const fresh = buildLessonMapData(englishUnitDefinitions, [])
assert.equal(fresh[0].status, 'current')
assert.ok(fresh.slice(1).every(item => item.status === 'locked'))
const explicit = buildLessonMapData(englishUnitDefinitions, [
  { lessonId: units[0].lessonId, completed: true, stars: 10 },
  { lessonId: units[1].lessonId, completed: false, unlocked: false },
  { lessonId: units[2].lessonId, completed: false, unlocked: true },
  { lessonId: units[3].lessonId, completed: false, unlocked: true, stars: -2 },
])
assert.deepEqual(explicit.slice(0, 4).map(item => item.status), ['completed', 'locked', 'current', 'available'])
assert.equal(explicit[0].stars, 3)
assert.equal(explicit[3].stars, 0)
for (const columns of [2, 4]) {
  const positions = units.map((_, index) => getMapPosition(index, columns))
  assert.equal(new Set(positions.map(p => `${p.row}:${p.column}`)).size, 16)
  positions.slice(1).forEach((point, index) => {
    const previous = positions[index]
    assert.equal(Math.abs(point.row - previous.row) + Math.abs(point.column - previous.column), 1)
  })
}
assert.equal(buildLessonMapData(lessonDefinitions, demoProgress).length, 41)
const { vietnameseLessonDefinitions, demoVietnameseProgress, buildVietnameseLessonMapData } = load('vietnameseData')
const stops = buildVietnameseLessonMapData(vietnameseLessonDefinitions, demoVietnameseProgress)
assert.equal(stops.length, 10)
assert.deepEqual(stops.slice(0, 3).map(item => item.status), ['completed', 'current', 'available'])
assert.ok(stops.slice(3).every(item => item.status === 'locked'))
assert.equal(stops.filter(item => item.status === 'completed').length, 1)
assert.equal(new Set(stops.map(item => item.nodeType)).size, 10)
assert.equal(stops[9].nodeType, 'storyCastle')
assert.deepEqual(stops.filter(item => item.isCheckpoint).map(item => item.id), [3, 5, 8, 10])
assert.ok(vietnameseLessonDefinitions.every((item, index) => item.href.endsWith(`/bai-${index + 1}`) && !('status' in item)))
for (const columns of [2, 4]) {
  const positions = stops.map((_, index) => getMapPosition(index, columns))
  positions.slice(1).forEach((point, index) => {
    assert.equal(Math.abs(point.row - positions[index].row) + Math.abs(point.column - positions[index].column), 1)
  })
}
assert.deepEqual(getMapPosition(9, 4), { row: 3, column: 2 })
console.log('Lesson journey: progress, route definitions, snake continuity and ocean regression passed.')
