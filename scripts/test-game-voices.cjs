const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { EventEmitter } = require('node:events')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { GameVoiceManager } = require('../src/components/games/general/GameVoiceManager.ts')
const { playQuestionVoice, stopQuestionVoice } = require('../src/components/games/general/scene-question-voice.ts')
const recordings = []
global.Audio = class {
  constructor(src) { this.src = src; this.paused = true; recordings.push(this) }
  play() { this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
  removeAttribute() {}
  load() {}
}
class Sound extends EventEmitter {
  play() { this.isPlaying = true; return !this.fail }
  stop() { this.isPlaying = false; this.emit('stop') }
  complete() { this.isPlaying = false; this.emit('complete') }
  destroy() { this.stop() }
}
function fixture() {
  recordings.length = 0
  const sounds = {}
  const sound = { mute: false, add(key) { return sounds[key] = new Sound() } }
  const scene = { sound, game: { events: new EventEmitter() }, events: new EventEmitter() }
  const manager = new GameVoiceManager(sound, [{ key: 'intro' }, { key: 'feedback' }, { key: 'win' }])
  return { scene, manager, sounds }
}
{
  const { scene, manager, sounds } = fixture()
  manager.prepareIntro()
  playQuestionVoice(scene, { instructionVoice: 'instruction', voice: 'question' })
  assert.equal(recordings.length, 0, 'instructions must wait during the intro delay')
  manager.playOnce('intro', 'intro', 'intro')
  assert.equal(recordings.length, 0, 'instructions must wait for intro completion')
  sounds.intro.complete()
  assert.equal(recordings[0].src, 'instruction')
  recordings[0].onended()
  assert.equal(recordings[1].src, 'question')
  manager.play('feedback', 'true')
  assert.equal(recordings[1].paused, true, 'feedback pauses question narration')
  manager.play('win', 'win')
  assert.equal(recordings[1].paused, true, 'priority replacement keeps narration paused')
  sounds.win.complete()
  assert.equal(recordings[1].paused, false)
  scene.events.emit('shutdown')
  manager.destroy()
}
{
  const { scene, manager, sounds } = fixture()
  manager.prepareIntro()
  playQuestionVoice(scene, { voice: 'question' })
  sounds.intro.fail = true
  manager.playOnce('intro', 'intro', 'intro')
  assert.equal(recordings[0].src, 'question', 'failed intro must release instructions')
  scene.events.emit('shutdown')
  manager.destroy()
}
{
  const { scene, manager, sounds } = fixture()
  manager.prepareIntro()
  playQuestionVoice(scene, { voice: 'old' })
  stopQuestionVoice(scene)
  playQuestionVoice(scene, { voice: 'latest' })
  scene.game.events.emit('game-ui:mute', true)
  manager.playOnce('intro', 'intro', 'intro')
  sounds.intro.complete()
  assert.equal(recordings.length, 0)
  scene.game.events.emit('game-ui:mute', false)
  assert.equal(recordings[0].src, 'latest')
  scene.game.events.emit('game-ui:restart')
  assert.equal(recordings[0].paused, true)
  scene.events.emit('shutdown')
  manager.destroy()
}
console.log('Game voice sequencing checks passed')
// Exercise the React voice hook with deterministic timers and minimal hook bindings.
{
  const Module = require('node:module')
  const originalLoad = Module._load
  const effects = []
  Module._load = function (name, ...args) {
    if (name === 'react') return {
      useRef: (current) => ({ current }),
      useState: (initial) => [typeof initial === 'function' ? initial() : initial],
      useMemo: (factory) => factory(),
      useCallback: (callback) => callback,
      useEffect: (effect) => { effects.push(effect) },
    }
    return originalLoad.call(this, name, ...args)
  }
  const { useGameVoices } = require('../src/components/games/general/useGameVoices.ts')
  Module._load = originalLoad
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  let pending
  global.setTimeout = (callback, delay) => { assert.equal(delay, 500); pending = callback; return 1 }
  global.clearTimeout = () => { pending = undefined }
  const { QuestionVoicePlayer } = require('../src/components/games/general/QuestionVoicePlayer.ts')
  recordings.length = 0
  const voices = useGameVoices([{ key: 'intro', src: 'intro' }], true)
  const cleanups = effects.map((effect) => effect())
  const player = new QuestionVoicePlayer()
  const unsubscribe = voices.channel.subscribe((busy) => player.setBlocked(busy))
  voices.scheduleIntro('intro')
  player.play(['instruction', 'question'])
  assert.equal(recordings.length, 1, 'React instructions wait through the 500 ms delay')
  pending()
  assert.equal(recordings.length, 1, 'React instructions wait through intro playback')
  recordings[0].onended()
  assert.equal(recordings[1].src, 'instruction')
  recordings[1].onended()
  assert.equal(recordings[2].src, 'question')
  player.stop()
  voices.reset()
  voices.scheduleIntro('intro')
  voices.reset()
  assert.equal(pending, undefined, 'restart cancels the previous intro timer')
  unsubscribe()
  cleanups.forEach((cleanup) => cleanup?.())
  global.setTimeout = originalSetTimeout
  global.clearTimeout = originalClearTimeout
  console.log('React voice delay and sequencing checks passed')
}
