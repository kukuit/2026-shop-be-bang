import type * as Phaser from 'phaser'

export type VoicePriority = 'false' | 'true' | 'intro' | 'win'

interface VoiceDefinition {
  key: string
  volume?: number
}

const PRIORITY: Record<VoicePriority, number> = {
  false: 1,
  true: 2,
  intro: 3,
  win: 4,
}

export class GameVoiceManager {
  private readonly voices = new Map<string, Phaser.Sound.BaseSound>()
  private readonly playedOnce = new Set<string>()
  private current?: Phaser.Sound.BaseSound
  private currentPriority = 0

  constructor(
    private readonly soundManager: Phaser.Sound.BaseSoundManager,
    definitions: VoiceDefinition[],
  ) {
    definitions.forEach(({ key, volume = 0.8 }) => {
      this.voices.set(key, soundManager.add(key, { volume }))
    })
  }

  play(key: string, priority: VoicePriority) {
    const voice = this.voices.get(key)
    if (!voice) return false

    if (this.current?.isPlaying) {
      if (PRIORITY[priority] <= this.currentPriority) return false
      this.current.stop()
    }

    this.current = voice
    this.currentPriority = PRIORITY[priority]
    const clearCurrent = () => {
      if (this.current !== voice) return
      this.current = undefined
      this.currentPriority = 0
    }
    voice.once('complete', clearCurrent)
    voice.once('stop', clearCurrent)
    voice.play()
    return true
  }

  playOnce(id: string, key: string, priority: VoicePriority) {
    if (this.playedOnce.has(id)) return false
    const played = this.play(key, priority)
    if (played) this.playedOnce.add(id)
    return played
  }

  destroy() {
    this.current?.stop()
    this.current = undefined
    this.currentPriority = 0
    this.voices.forEach((voice) => voice.destroy())
    this.voices.clear()
    this.playedOnce.clear()
  }
}
