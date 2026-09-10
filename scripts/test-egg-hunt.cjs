const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/components/games/egg-hunt/board.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const boardModule = { exports: {} }
new Function('exports', compiled.outputText)(boardModule.exports)
const { createBoard, canCollect, availableNumbers, TARGET } = boardModule.exports

// Expected answers read from the three numbered triangles bordering each egg,
// ordered from left to right, top to bottom on the reference board.
const answers = [6, 2, 4, 6, 2, 3, 1, 1, 5, 4, 5, 2, 5, 3, 3, 2]
const { eggs } = createBoard()
assert.equal(eggs.length, answers.length)
eggs.forEach((egg, index) => {
  assert.equal(egg.surroundingCellIds.length, 3)
  assert.deepEqual(egg.surroundingNumbers, Array(3).fill(answers[index]))
  for (let dice = 1; dice <= 6; dice++) {
    assert.equal(canCollect(egg, dice), dice === answers[index], `Egg ${index + 1}, dice ${dice}`)
    assert.equal(canCollect({ ...egg, collected: true }, dice), false)
  }
})
assert.deepEqual(eggs.filter(egg => canCollect(egg, 5)).map(egg => egg.id), [61, 71, 92])
assert.deepEqual(availableNumbers(eggs).sort(), [1, 2, 3, 4, 5, 6])
assert.deepEqual(availableNumbers(eggs.map(egg => ({ ...egg, collected: true }))), [])
for (let dice = 1; dice <= 6; dice++) {
  const remaining = eggs.map((egg, index) => ({ ...egg, collected: answers[index] !== dice }))
  assert.deepEqual(availableNumbers(remaining), [dice])
}
// Every possible collection of fewer than TARGET eggs leaves a playable roll.
for (let mask = 0; mask < 2 ** eggs.length; mask++) {
  const collectedCount = mask.toString(2).replace(/0/g, '').length
  if (collectedCount >= TARGET) continue
  const remaining = eggs.map((egg, index) => ({ ...egg, collected: Boolean(mask & (1 << index)) }))
  const numbers = availableNumbers(remaining)
  assert.ok(numbers.length > 0)
  for (const number of numbers) assert.ok(remaining.some(egg => canCollect(egg, number)))
}
assert.ok(createBoard().eggs.every(egg => !egg.collected))
console.log('Egg hunt passed: all 96 egg/dice pairs, collected eggs, roll availability, and every state before 6 collections.')

const { createRandomBoard } = boardModule.exports
const layouts = new Set()
for (let seed = 0; seed < 200; seed++) {
  let state = seed
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32 }
  const board = createRandomBoard(random)
  assert.equal(board.cells.length, 120)
  assert.equal(board.eggs.length, 16)
  assert.equal(board.cells.filter(cell => cell.value === null).length, 16)
  assert.equal(new Set(board.eggs.map(egg => egg.id)).size, 16)
  assert.deepEqual(availableNumbers(board.eggs).sort(), [1, 2, 3, 4, 5, 6])
  layouts.add(board.eggs.map(egg => egg.id).sort((a, b) => a - b).join(','))
  for (const egg of board.eggs) {
    const cell = board.cells[egg.id]
    assert.equal(cell.value, null)
    const adjacent = board.cells.filter(other => other.id !== cell.id && other.points.filter(p => cell.points.some(q => p.x === q.x && p.y === q.y)).length === 2)
    assert.equal(adjacent.length, 3)
    assert.ok(adjacent.every(other => other.value >= 1 && other.value <= 6))
    assert.equal(new Set(adjacent.map(other => other.value)).size, 1)
    for (let dice = 1; dice <= 6; dice++) assert.equal(canCollect(egg, dice), adjacent[0].value === dice)
  }
  for (let turn = 0; turn < TARGET; turn++) {
    const counts = Object.fromEntries([1, 2, 3, 4, 5, 6].map(number => [number, board.eggs.filter(egg => egg.collected && egg.surroundingNumbers.includes(number)).length]))
    const numbers = availableNumbers(board.eggs, counts)
    assert.ok(numbers.length)
    assert.ok(numbers.every(number => counts[number] < 2))
    const egg = board.eggs.find(egg => canCollect(egg, numbers[0]))
    assert.ok(egg)
    egg.collected = true
    assert.equal(canCollect(egg, numbers[0]), false)
  }
}
assert.ok(layouts.size > 190, 'Shuffling must vary actual egg positions')
for (const value of [0, .5, .999999]) {
  const board = createRandomBoard(() => value)
  assert.equal(board.eggs.length, 16)
  for (const egg of board.eggs) assert.deepEqual(egg.surroundingCellIds.map(id => board.cells[id].value), egg.surroundingNumbers)
}
console.log('Random boards passed: 200 seeded layouts, all egg/dice answers, full games, and constant RNG sequences.')

assert.ok(availableNumbers(eggs, { 5: 1 }).includes(5))
assert.ok(!availableNumbers(eggs, { 5: 2 }).includes(5))
assert.ok(!availableNumbers(eggs.map(egg => ({ ...egg, collected: canCollect(egg, 5) })), {}).includes(5))
assert.deepEqual(availableNumbers(eggs, {}), availableNumbers(createBoard().eggs))
// Explore every legal result sequence on the reference board through six rolls.
function verifyRolls(remaining, counts = {}, turn = 0) {
  if (turn === TARGET) return
  const numbers = availableNumbers(remaining, counts)
  assert.ok(numbers.length, 'A six-egg game must never run out of legal rolls')
  for (const number of numbers) {
    assert.ok((counts[number] ?? 0) < 2)
    const picked = remaining.find(egg => canCollect(egg, number))
    assert.ok(picked)
    verifyRolls(remaining.map(egg => egg.id === picked.id ? { ...egg, collected: true } : egg), { ...counts, [number]: (counts[number] ?? 0) + 1 }, turn + 1)
  }
}
verifyRolls(createBoard().eggs)
console.log('Roll limits passed: exhausted answers excluded, at most two occurrences, and all six-roll sequences remain playable.')
