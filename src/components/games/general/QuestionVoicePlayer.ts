/** Plays the instruction and question recording in order. */
export class QuestionVoicePlayer {
  private audio?: HTMLAudioElement
  private queue: Array<{ src?: string; text?: string }> = []
  private blocked = false
  private utterance?: SpeechSynthesisUtterance
  private speechText?: string

  play(sources: Array<string | undefined>, fallback?: { instruction?: string; target?: string }) {
    this.stop()
    const texts = [fallback?.instruction, fallback?.target]
    this.queue = sources.map((src, index) => ({ src, text: texts[index] })).filter(item => item.src || item.text)
    this.next()
  }

  setBlocked(blocked: boolean) {
    this.blocked = blocked
    if (this.speechText) {
      if (blocked) this.cancelSpeech()
      else if (!this.utterance) this.speak(this.speechText)
      return
    }
    if (blocked) this.audio?.pause()
    else if (this.audio) void this.audio.play().catch(() => undefined)
    else this.next()
  }

  stop() {
    this.queue = []
    this.speechText = undefined
    this.cancelSpeech()
    if (!this.audio) return
    this.audio.onended = null
    this.audio.onerror = null
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    this.audio = undefined
  }

  private next() {
    if (this.blocked) return
    const item = this.queue.shift()
    if (!item) { this.audio = undefined; return }
    const { src, text } = item
    if (!src) { if (text) this.speak(text); return }
    const audio = new Audio(src)
    this.audio = audio
    audio.volume = 0.8
    audio.onended = () => {
      if (this.audio === audio) this.next()
    }
    audio.onerror = () => {
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
    if (!this.utterance) return
    this.utterance.onend = this.utterance.onerror = null
    this.utterance = undefined
    window.speechSynthesis.cancel()
  }

  private speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { this.next(); return }
    this.speechText = text
    if (this.blocked) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN'
    utterance.rate = .85
    const voice = window.speechSynthesis.getVoices().find(candidate => candidate.lang.startsWith('vi'))
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
