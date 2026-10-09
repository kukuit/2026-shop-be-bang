import { ComposedAudioPlayer, NATURAL_COMPOSED_AUDIO_OPTIONS } from './composed-audio'
import type { VoiceSegment } from './composed-voice'

/** Routes composed sentences to Web Audio; single recordings retain their own path. */
export class QuestionVoicePlayer {
  private audio?: HTMLAudioElement
  private activeAudio = new Set<HTMLAudioElement>()

  private queue: Array<{ src?: string; text?: string; playbackRate?: number; pauseAfterMs?: number }> = []
  private blocked = false
  private pauseTimer?: ReturnType<typeof setTimeout>
  private pauseDeadline = 0
  private pauseRemainingMs = 0
  private waitingForNext = false
  private utterance?: SpeechSynthesisUtterance
  private speechText?: string
  private speechPauseAfterMs = 0
  private cancelVoiceWait?: () => void
  private composed?: ComposedAudioPlayer
  private composedActive = false
  private generation = 0

  get pending() {
    return this.composedActive || this.waitingForNext || this.queue.length > 0 || Boolean(this.audio || this.speechText)
  }

  playComposedSequence(sequence: VoiceSegment[]) {
    if (sequence.length < 2 || typeof AudioContext === 'undefined') {
      this.playSequence(sequence)
      return
    }
    this.stop()
    const generation = this.generation
    this.composed ??= new ComposedAudioPlayer()
    this.composed.setBlocked(this.blocked)
    this.composedActive = true
    void this.composed.play(sequence, NATURAL_COMPOSED_AUDIO_OPTIONS, () => {
      if (generation === this.generation) this.composedActive = false
    }).catch(() => {
      if (generation !== this.generation) return
      // Retain the existing recording/TTS fallback if loading or decoding fails.
      this.playSequence(sequence)
    })
  }

  play(sources: Array<string | undefined>, fallback?: { instruction?: string; target?: string }) {
    const texts = [fallback?.instruction, fallback?.target]
    const sequence = sources.map((src, index) => ({ src, text: texts[index] ?? '' }))
    if (sources.length > 1 && sources.every((src): src is string => Boolean(src))) {
      this.playComposedSequence(sources.map((src, index) => ({ src, text: texts[index] ?? '' })))
      return
    }
    this.playSequence(sequence)
  }

  playSequence(sequence: Array<{ src?: string; text?: string; playbackRate?: number }>) {
    this.stop()
    this.queue = sequence.filter(item => item.src || item.text)
    this.next()
  }

  setBlocked(blocked: boolean) {
    this.blocked = blocked
    this.composed?.setBlocked(blocked)
    if (this.composedActive) return
    if (blocked) this.pauseGap()
    for (const audio of Array.from(this.activeAudio)) {
      if (blocked) audio.pause()
      else void audio.play().catch(() => undefined)
    }
    if (this.speechText) {
      if (blocked) this.cancelSpeech()
      else if (!this.utterance) this.speak(this.speechText, this.speechPauseAfterMs)
      return
    }
    if (this.waitingForNext) {
      if (!blocked) this.resumeGap()
      return
    }
    if (!blocked && !this.audio) this.next()
  }

  stop() {
    this.generation++
    if (this.pauseTimer) clearTimeout(this.pauseTimer)
    this.pauseTimer = undefined
    this.pauseDeadline = 0
    this.pauseRemainingMs = 0
    this.waitingForNext = false
    this.composed?.stop()
    this.composedActive = false
    this.queue = []
    this.speechText = undefined
    this.speechPauseAfterMs = 0
    this.cancelSpeech()

    for (const audio of Array.from(this.activeAudio)) {
      audio.onended = audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    this.activeAudio.clear()
    this.audio = undefined
  }

  dispose() {
    this.stop()
    this.composed?.dispose()
    this.composed = undefined
  }

  private next() {
    if (this.blocked) return
    const item = this.queue.shift()
    if (!item) { this.audio = undefined; return }

    const { src, text, playbackRate = 1, pauseAfterMs = 0 } = item
    if (!src) { if (text) this.speak(text, pauseAfterMs); else this.advance(pauseAfterMs); return }
    const audio = new Audio(src)
    this.audio = audio
    this.activeAudio.add(audio)
    audio.volume = 0.8
    audio.playbackRate = playbackRate
    audio.preservesPitch = true
    audio.onended = () => {
      this.activeAudio.delete(audio)
      audio.onended = audio.onerror = null
      if (this.audio !== audio) return
      this.audio = undefined
      this.advance(pauseAfterMs)
    }
    audio.onerror = () => {
      this.activeAudio.delete(audio)
      audio.onended = audio.onerror = null
      audio.pause()
      if (this.audio !== audio) return
  
      if (!text) { this.advance(pauseAfterMs); return }
      audio.onended = audio.onerror = null
      audio.pause()
      this.audio = undefined
      this.speak(text, pauseAfterMs)
    }
    void audio.play().catch(() => {
      if (!this.blocked && this.audio === audio) audio.onerror?.(new Event('error'))
    })
  }

  private cancelSpeech() {
    this.cancelVoiceWait?.()
    this.cancelVoiceWait = undefined
    if (!this.utterance) return
    this.utterance.onend = this.utterance.onerror = null
    this.utterance = undefined
    window.speechSynthesis.cancel()
  }

  private speak(text: string, pauseAfterMs = 0) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { this.advance(pauseAfterMs); return }
    this.speechText = text
    this.speechPauseAfterMs = pauseAfterMs
    if (this.blocked) return
    if (this.cancelVoiceWait) return
    const synth = window.speechSynthesis
    const findVietnameseVoice = () => {
      const voices = synth.getVoices()
      return voices.find(candidate => candidate.lang.toLowerCase().replace('_', '-') === 'vi-vn')
        ?? voices.find(candidate => /^vi(?:[-_]|$)/i.test(candidate.lang))
    }
    const voice = findVietnameseVoice()
    if (voice) { this.speakWithVoice(text, voice, pauseAfterMs); return }

    // Some browsers populate their voices asynchronously, including remote voices.
    const onVoicesChanged = () => {
      const loadedVoice = findVietnameseVoice()
      if (!loadedVoice) return
      cleanup()
      this.speakWithVoice(text, loadedVoice, pauseAfterMs)
    }
    const timer = setTimeout(() => {
      cleanup()
      // Let the engine resolve vi-VN if it does not expose a Vietnamese voice.
      this.speakWithVoice(text, findVietnameseVoice(), pauseAfterMs)
    }, 1500)
    const cleanup = () => {
      clearTimeout(timer)
      synth.removeEventListener('voiceschanged', onVoicesChanged)
      this.cancelVoiceWait = undefined
    }
    this.cancelVoiceWait = cleanup
    synth.addEventListener('voiceschanged', onVoicesChanged)
    onVoicesChanged()
  }

  private speakWithVoice(text: string, voice: SpeechSynthesisVoice | undefined, pauseAfterMs: number) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN'
    utterance.rate = .85
    if (voice) utterance.voice = voice
    this.utterance = utterance
    utterance.onend = utterance.onerror = () => {
      if (this.utterance !== utterance) return
      this.utterance = undefined
      this.speechText = undefined
      this.speechPauseAfterMs = 0
      this.advance(pauseAfterMs)
    }
    window.speechSynthesis.speak(utterance)
  }

  private advance(pauseAfterMs = 0) {
    if (!this.queue.length) { this.next(); return }
    const pause = Math.max(0, Math.min(1000, pauseAfterMs))
    if (pause === 0) { this.next(); return }
    this.waitingForNext = true
    this.pauseRemainingMs = pause
    this.resumeGap()
  }

  private pauseGap() {
    if (!this.pauseTimer) return
    clearTimeout(this.pauseTimer)
    this.pauseTimer = undefined
    this.pauseRemainingMs = Math.max(0, this.pauseDeadline - Date.now())
    this.pauseDeadline = 0
  }

  private resumeGap() {
    if (!this.waitingForNext || this.blocked || this.pauseTimer) return
    if (this.pauseRemainingMs <= 0) {
      this.waitingForNext = false
      this.pauseRemainingMs = 0
      this.next()
      return
    }
    this.pauseDeadline = Date.now() + this.pauseRemainingMs
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = undefined
      this.pauseDeadline = 0
      this.pauseRemainingMs = 0
      this.waitingForNext = false
      this.next()
    }, this.pauseRemainingMs)
  }
}
