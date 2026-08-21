type AudioContextLike = { state?: string; resume?: () => Promise<void> }
type PhaserGameLike = {
  sound?: {
    locked?: boolean
    unlocked?: boolean
    unlock?: () => void
    context?: AudioContextLike
  }
}

export async function unlockGameAudio(game?: PhaserGameLike | null) {
  const sound = game?.sound
  if (sound?.context) {
    if (sound.context.state === 'suspended') await sound.context.resume?.()
    sound.locked = false
    sound.unlocked = true
    return
  }
  sound?.unlock?.()
}
