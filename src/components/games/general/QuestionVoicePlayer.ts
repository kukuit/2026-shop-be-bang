/** Plays the instruction and question recording in order. */
export class QuestionVoicePlayer {
  private audio?: HTMLAudioElement
  private activeAudio = new Set<HTMLAudioElement>()
  private overlapTimer?: ReturnType<typeof setInterval>
  private queue: Array<{ src?: string; text?: string; playbackRate?: number; overlapNext?: number }> = []
  private blocked = false
  private utterance?: SpeechSynthesisUtterance
  private speechText?: string

  play(sources: Array<string | undefined>, fallback?: { instruction?: string; target?: string }) {
    const texts = [fallback?.instruction, fallback?.target]
    this.playSequence(sources.map((src, index) => ({ src, text: texts[index] })))
  }

  playSequence(sequence: Array<{ src?: string; text?: string; playbackRate?: number; overlapNext?: number }>) {
    this.stop()
    this.queue = sequence.filter(item => item.src || item.text)
    this.next()
  }

  setBlocked(blocked: boolean) {
    this.blocked = blocked
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
    this.queue = []
    this.speechText = undefined
    this.cancelSpeech()
    this.clearOverlapTimer()
    for (const audio of Array.from(this.activeAudio)) {
      audio.onended = audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    this.activeAudio.clear()
    this.audio = undefined
  }

  private clearOverlapTimer() {
    if (this.overlapTimer) clearInterval(this.overlapTimer)
    this.overlapTimer = undefined
  }

  private next() {
    if (this.blocked) return
    const item = this.queue.shift()
    if (!item) { this.audio = undefined; return }
    this.clearOverlapTimer()
    const { src, text, playbackRate = 1, overlapNext = 0 } = item
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
      this.clearOverlapTimer()
      if (!text) { this.next(); return }
      audio.onended = audio.onerror = null
      audio.pause()
      this.audio = undefined
      this.speak(text)
    }
    if (overlapNext > 0 && this.queue[0]?.src) {
      // Poll media time so pause/buffering do not consume the overlap window.
      this.overlapTimer = setInterval(() => {
        if (this.blocked || this.audio !== audio || audio.paused || !Number.isFinite(audio.duration)) return
        if (audio.duration > overlapNext && audio.currentTime >= audio.duration - overlapNext) {
          this.next()
        }
      }, 20)
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
