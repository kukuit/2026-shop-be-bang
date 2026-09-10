import { getVoiceChannel } from './VoiceChannel'
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

  prepareIntro() { getVoiceChannel(this.soundManager).set('intro-pending', true) }

  play(key: string, priority: VoicePriority) {
    const voice = this.voices.get(key)
    if (!voice) return false

    if (this.current) {
      if (PRIORITY[priority] <= this.currentPriority) return false
      // Hold the channel while replacing a lower-priority voice.
      const previous = this.current
      this.current = undefined
      previous.stop()
    }

    getVoiceChannel(this.soundManager).set('voice', true)
    this.current = voice
    this.currentPriority = PRIORITY[priority]
    const clearCurrent = () => {
      voice.off('complete', clearCurrent)
      voice.off('stop', clearCurrent)
      if (this.current !== voice) return
      this.current = undefined
      this.currentPriority = 0
      getVoiceChannel(this.soundManager).set('voice', false)
    }
    voice.once('complete', clearCurrent)
    voice.once('stop', clearCurrent)
    if (!voice.play()) { clearCurrent(); return false }
    return true
  }

  playOnce(id: string, key: string, priority: VoicePriority) {
    if (this.playedOnce.has(id)) {
      if (priority === 'intro') getVoiceChannel(this.soundManager).set('intro-pending', false)
      return false
    }
    const played = this.play(key, priority)
    if (priority === 'intro') getVoiceChannel(this.soundManager).set('intro-pending', false)
    if (played) this.playedOnce.add(id)
    return played
  }

  destroy() {
    this.current = undefined
    this.currentPriority = 0
    this.voices.forEach((voice) => voice.destroy())
    getVoiceChannel(this.soundManager).set('intro-pending', false)
    getVoiceChannel(this.soundManager).set('voice', false)
    this.voices.clear()
    this.playedOnce.clear()
  }
}
