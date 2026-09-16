const assert = require('node:assert/strict')
const load = require('./lib/load-project-ts.cjs')()
const { detectSpeechBounds, ComposedAudioPlayer, isNumberIntroduction } = load('src/components/games/general/composed-audio.ts')
assert.equal(isNumberIntroduction({ text: 'Số' }, { text: 'mười' }), true)
assert.equal(isNumberIntroduction({ text: 'Hãy chọn số' }, { text: 'tám' }), true)
assert.equal(isNumberIntroduction({ text: 'số' }, { text: 'có mấy đơn vị' }), false)
assert.equal(isNumberIntroduction({ text: 'ba' }, { text: 'mươi' }), false)
function buffer(channels) {
  return { sampleRate: 1000, length: channels[0].length, duration: channels[0].length / 1000,
    numberOfChannels: channels.length, getChannelData: i => channels[i] }
}
const data = new Float32Array(200)
data.fill(.2, 30, 160)
const clip = buffer([data])
assert.deepEqual(detectSpeechBounds(clip), { start: .03, end: .16 })
assert.deepEqual(detectSpeechBounds(buffer([new Float32Array(200), data])), { start: .03, end: .16 })
assert.deepEqual(detectSpeechBounds(buffer([new Float32Array(200)])), { start: 0, end: .2 })
const inner = data.slice(); inner.fill(0, 70, 100)
assert.deepEqual(detectSpeechBounds(buffer([inner])), { start: .03, end: .16 })
let fetches = 0, decodes = 0
const sources = []
const contexts = []
global.fetch = async () => { fetches++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) } }
global.AudioContext = class {
  constructor() { contexts.push(this) }
  state = 'suspended'
  currentTime = 10
  destination = {}
  resume() { this.state = 'running'; return Promise.resolve() }
  suspend() { this.state = 'suspended'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
  async decodeAudioData() { decodes++; return clip }
  createBufferSource() {
    const source = { playbackRate: {}, connect() {}, disconnect() {}, stop() { this.stopped = true },
      start(...args) { this.args = args } }
    sources.push(source)
    return source
  }
  createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } } }
}
async function main() {
  const player = new ComposedAudioPlayer()
  const sequence = [{ src: 'ba.mp3', text: 'ba' }, { src: 'muoi.mp3', text: 'mươi' }, { src: 'ba.mp3', text: 'ba' }]
  let ended = 0
  const measurements = await player.play(sequence, { paddingMs: 10, gapMs: 5 }, () => ended++)
  assert.equal(fetches, 2); assert.equal(decodes, 2)
  assert.ok(Math.abs(measurements[0].trimmedStartMs - 20) < .001)
  assert.ok(Math.abs(measurements[0].trimmedEndMs - 30) < .001)
  assert.ok(Math.abs(sources[1].args[0] - sources[0].args[0] - .155) < .00001)
  assert.ok(Math.abs(sources[0].args[1] - .02) < .00001)
  assert.ok(Math.abs(sources[0].args[2] - .15) < .00001)
  assert.equal(measurements[2].trimmedEndMs, 0, 'preserve the complete tail of the final word')
  assert.ok(Math.abs(sources[2].args[2] - .18) < .00001)
  assert.equal(sources[2].playbackRate.value, 1, 'final word retains its original speed')
  sources[2].onended(); assert.equal(ended, 1)
  await player.play(sequence)
  assert.equal(fetches, 2); assert.equal(decodes, 2)
  player.stop()
  assert.ok(sources.slice(3).every(source => source.stopped && source.onended === null))
  const count = sources.length
  const pending = player.play(sequence)
  player.stop()
  await pending
  assert.equal(sources.length, count, 'stop while loading must prevent later playback')
  const offset = sources.length
  const joined = await player.play([
    { src: 'so.mp3', text: 'số' }, { src: 'muoi.mp3', text: 'mười' },
    { src: 'ba.mp3', text: 'ba' }, { src: 'question.mp3', text: 'có mấy đơn vị' },
  ], { paddingMs: 15, gapMs: 50 })
  assert.ok(Math.abs(joined[0].trimmedEndMs - 37) < .001)
  assert.ok(Math.abs(joined[1].trimmedStartMs - 27) < .001)
  const [intro, number, next] = sources.slice(offset)
  assert.ok(Math.abs(number.args[0] - intro.args[0] - intro.args[2]) < .00001, 'no added gap after số')
  assert.ok(Math.abs(next.args[0] - number.args[0] - number.args[2] - .05) < .00001, 'other boundaries retain selected gap')
  assert.equal(joined.at(-1).trimmedEndMs, 0)
  player.setBlocked(true)
  assert.equal(contexts.at(-1).state, 'suspended')
  player.setBlocked(false)
  assert.equal(contexts.at(-1).state, 'running')
  player.dispose()
  assert.equal(contexts.at(-1).state, 'closed')
  const { QuestionVoicePlayer } = load('src/components/games/general/QuestionVoicePlayer.ts')
  const gamePlayer = new QuestionVoicePlayer()
  const recordings = []
  global.Audio = class {
    constructor(src) { recordings.push(src) }
    play() { return Promise.resolve() }
    pause() {} removeAttribute() {} load() {}
  }
  const flush = () => new Promise(resolve => setImmediate(resolve))
  gamePlayer.setBlocked(true)
  gamePlayer.playComposedSequence(sequence)
  await flush()
  assert.equal(contexts.at(-1).state, 'suspended', 'muted/paused playback must stay suspended')
  gamePlayer.setBlocked(false)
  assert.equal(contexts.at(-1).state, 'running')
  const beforeStop = sources.length
  gamePlayer.playComposedSequence(sequence)
  gamePlayer.stop()
  await flush()
  assert.equal(sources.length, beforeStop, 'changing questions cancels pending composed audio')
  gamePlayer.play(['single.mp3'])
  assert.deepEqual(recordings, ['single.mp3'], 'single recording keeps original player')
  gamePlayer.dispose()
  assert.equal(contexts.at(-1).state, 'closed')
  const failing = new QuestionVoicePlayer()
  global.fetch = async () => { throw new Error('offline') }
  failing.playComposedSequence(sequence)
  await flush()
  assert.equal(recordings.at(-1), 'ba.mp3', 'failed Web Audio load falls back to the existing player')
  failing.dispose()
  console.log('PASS silence bounds, stereo, internal pauses, padding, scheduling, cache reuse and cancellation')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
