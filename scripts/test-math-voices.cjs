const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const load = require('./lib/load-project-ts.cjs')()
const { createMathVoiceSequence, MATH_VOICE_FILES } = load('src/components/games/general/math-voice.ts')
const { createQuestionPool, readNumber } = load('src/app/game/lop-2/toan/bai-1/content.ts')
const { QuestionVoicePlayer } = load('src/components/games/general/QuestionVoicePlayer.ts')
for (const file of Object.values(MATH_VOICE_FILES)) {
  assert.ok(fs.statSync(path.join(__dirname, '../public/games/general/voices/toan', `${file}.mp3`)).size > 0, file)
}
for (let n = 0; n <= 100; n++) assert.ok(createMathVoiceSequence(readNumber(n)), `Number ${n}`)
for (const q of [...createQuestionPool('bubble-shooter'), ...createQuestionPool('drag-drop')]) {
  const sequence = createMathVoiceSequence(q.voiceText)
  assert.ok(sequence?.length, q.id)
  assert.equal(sequence.map(part => part.text).join(' '), q.voiceText.toLowerCase().replace(/[.?]/g, ''))
}
assert.equal(createMathVoiceSequence('Nội dung chưa có bản thu'), undefined)
assert.deepEqual(createMathVoiceSequence('Hãy chọn số hai mươi tư.').map(p => path.basename(p.src)),
  ['hay-chon-so.mp3', 'hai.mp3', 'muoi-hang-chuc.mp3', 'tu.mp3'])
assert.equal(createMathVoiceSequence('Hãy chọn số bé nhất trong các đáp án.').length, 1)

const played = []
global.Audio = class {
  constructor(src) { this.src = src; played.push(this) }
  play() { this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
  removeAttribute() {}
  load() {}
}
const player = new QuestionVoicePlayer()
const sequence = createMathVoiceSequence('Hãy chọn số hai mươi tư.')
player.playSequence(sequence)
assert.equal(played.length, 1)
assert.equal(played[0].playbackRate, 1)
played[0].onended()
assert.equal(played[1].src, sequence[1].src)
assert.equal(played[1].playbackRate, 1)
assert.equal(played[1].preservesPitch, true)
player.setBlocked(true)
assert.equal(played[1].paused, true)
player.setBlocked(false)
assert.equal(played[1].paused, false)
const staleEnd = played[1].onended
player.playSequence(sequence)
staleEnd()
assert.equal(played.length, 3)
played[2].onended()
played[3].onended()
played[4].onended()
played[5].onended()
assert.deepEqual(played.slice(2).map(p => p.src), sequence.map(p => p.src))
player.stop()
player.setBlocked(true)
player.playSequence(sequence)
assert.equal(played.length, 6)
player.setBlocked(false)
assert.equal(played.length, 7)
player.stop()
assert.equal(played[6].onended, null)
// If an ended event arrives while blocked, resume must advance, not replay
// the completed segment or overlap it with the next recording.
player.playSequence(sequence)
const boundaryAudio = played.at(-1)
player.setBlocked(true)
boundaryAudio.onended()
const beforeResume = played.length
player.setBlocked(false)
assert.equal(played.length, beforeResume + 1)
assert.equal(played.at(-1).src, sequence[1].src)
player.stop()
console.log('34 recordings, numbers 0–100, all bubble-shooter and drag-drop questions, playback order/replay/pause/stop passed')

async function testOverlap() {
  assert.equal(sequence[0].overlapNext, undefined)
  assert.equal(sequence[1].overlapNext, 0.15)
  assert.equal(sequence[2].overlapNext, 0.15)
  assert.equal(sequence[3].overlapNext, undefined)
  const start = played.length
  player.playSequence(sequence.slice(1))
  const first = played.at(-1)
  first.duration = 1
  first.currentTime = 0.86
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(played.length, start + 2)
  const second = played.at(-1)
  first.onended()
  assert.equal(played.length, start + 2, 'old ending must not skip another word')
  player.setBlocked(true)
  assert.equal(second.paused, true)
  player.stop()
  assert.equal(second.onended, null)
  player.setBlocked(false)
  console.log('Number-only 150ms overlap, normal speed, old ending and cancellation passed')
}
testOverlap().catch(error => { player.stop(); console.error(error); process.exitCode = 1 })
