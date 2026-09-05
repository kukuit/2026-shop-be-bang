/** Plays the instruction and question recording in order. */
export class QuestionVoicePlayer {
  private audio?: HTMLAudioElement
  private queue: string[] = []
  private blocked = false

  play(sources: Array<string | undefined>) {
    this.stop()
    this.queue = sources.filter((src): src is string => Boolean(src))
    this.next()
  }

  setBlocked(blocked: boolean) {
    this.blocked = blocked
    if (blocked) this.audio?.pause()
    else if (this.audio) void this.audio.play().catch(() => undefined)
    else this.next()
  }

  stop() {
    this.queue = []
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
    const src = this.queue.shift()
    if (!src) { this.audio = undefined; return }
    const audio = new Audio(src)
    this.audio = audio
    audio.volume = 0.8
    audio.onended = audio.onerror = () => {
      if (this.audio === audio) this.next()
    }
    void audio.play().catch(() => undefined)
  }
}
