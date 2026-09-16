import { ComposedAudioPlayer } from './composed-audio'
import type { VoiceSegment } from './composed-voice'

/** Routes composed sentences to Web Audio; single recordings retain their own path. */
export class QuestionVoicePlayer {
  private audio?: HTMLAudioElement
  private activeAudio = new Set<HTMLAudioElement>()

  private queue: Array<{ src?: string; text?: string; playbackRate?: number }> = []
  private blocked = false
  private utterance?: SpeechSynthesisUtterance
  private speechText?: string
  private cancelVoiceWait?: () => void
  private composed?: ComposedAudioPlayer
  private composedActive = false
  private generation = 0

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
    void this.composed.play(sequence, {}, () => {
      if (generation === this.generation) this.composedActive = false
    }).catch(() => {
      if (generation !== this.generation) return
      // Retain the existing recording/TTS fallback if loading or decoding fails.
      this.playSequence(sequence)
    })
  }

  play(sources: Array<string | undefined>, fallback?: { instruction?: string; target?: string }) {
    const texts = [fallback?.instruction, fallback?.target]
    this.playSequence(sources.map((src, index) => ({ src, text: texts[index] })))
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
    for (const audio of Array.from(this.activeAudio)) {
      if (blocked) audio.pause()
      else void audio.play().catch(() => undefined)
    }
    if (this.speechText) {
      if (blocked) this.cancelSpeech()
      else if (!this.utterance) this.speak(this.speechText)
      return
    }
    if (!blocked && !this.audio) this.next()
  }

  stop() {
    this.generation++
    this.composed?.stop()
    this.composedActive = false
    this.queue = []
    this.speechText = undefined
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

    const { src, text, playbackRate = 1 } = item
    if (!src) { if (text) this.speak(text); return }
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
      this.next()
    }
    audio.onerror = () => {
      this.activeAudio.delete(audio)
      audio.onended = audio.onerror = null
      audio.pause()
      if (this.audio !== audio) return
  
      if (!text) { this.next(); return }
      audio.onended = audio.onerror = null
      audio.pause()
      this.audio = undefined
      this.speak(text)
    }
    void audio.play().catch(() => undefined)
  }

  private cancelSpeech() {
    this.cancelVoiceWait?.()
    this.cancelVoiceWait = undefined
    if (!this.utterance) return
    this.utterance.onend = this.utterance.onerror = null
    this.utterance = undefined
    window.speechSynthesis.cancel()
  }

  private speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { this.next(); return }
    this.speechText = text
    if (this.blocked) return
    if (this.cancelVoiceWait) return
    const synth = window.speechSynthesis
    const findVietnameseVoice = () => {
      const voices = synth.getVoices()
      return voices.find(candidate => candidate.lang.toLowerCase().replace('_', '-') === 'vi-vn')
        ?? voices.find(candidate => /^vi(?:[-_]|$)/i.test(candidate.lang))
    }
    const voice = findVietnameseVoice()
    if (voice) { this.speakWithVoice(text, voice); return }

    // Some browsers populate their voices asynchronously, including remote voices.
    const onVoicesChanged = () => {
      const loadedVoice = findVietnameseVoice()
      if (!loadedVoice) return
      cleanup()
      this.speakWithVoice(text, loadedVoice)
    }
    const timer = setTimeout(() => {
      cleanup()
      // Let the engine resolve vi-VN if it does not expose a Vietnamese voice.
      this.speakWithVoice(text, findVietnameseVoice())
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

  private speakWithVoice(text: string, voice?: SpeechSynthesisVoice) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN'
    utterance.rate = .85
    if (voice) utterance.voice = voice
    this.utterance = utterance
    utterance.onend = utterance.onerror = () => {
      if (this.utterance !== utterance) return
      this.utterance = undefined
      this.speechText = undefined
      this.next()
    }
    window.speechSynthesis.speak(utterance)
  }
}
