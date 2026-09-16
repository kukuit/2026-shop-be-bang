const assert = require('node:assert/strict')
const load = require('./lib/load-project-ts.cjs')()
const { generateVoiceSamples, GAME_NAMES } = load('src/app/game/test/composed-voice/samples.ts')
const { createMathQuestionVoice } = load('src/components/games/general/math-voice.ts')
let seed = 83
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
let previous
for (let run = 0; run < 20; run++) {
  const samples = generateVoiceSamples(random)
  assert.equal(samples.length, 20)
  assert.equal(new Set(samples.map(sample => sample.text)).size, 20)
  for (const game of Object.keys(GAME_NAMES)) assert.equal(samples.filter(sample => sample.game === game).length, 5)
  for (const sample of samples) {
    assert.ok(sample.sequence.length >= 2)
    assert.deepEqual(sample.sequence, createMathQuestionVoice(sample.text).voiceSequence)
  }
  const ids = samples.map(sample => sample.id)
  if (previous) assert.notDeepEqual(ids, previous)
  previous = ids
}
console.log('PASS 20 randomized batches: 20 unique sentences, 5 per game, composed recordings match gameplay')
