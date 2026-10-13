type SoundName = 'shoot' | 'hit' | 'death' | 'player-hit' | 'gate' | 'level' | 'game-over' | 'victory' | 'empty'

let context: AudioContext | null = null

function getContext() {
  if (typeof window === 'undefined') return null
  context ??= new window.AudioContext()
  if (context.state === 'suspended') void context.resume().catch(() => undefined)
  return context
}

export function unlockGameAudio() {
  getContext()
}

export function playGameSound(name: SoundName, volume = 0.12) {
  const audio = getContext()
  if (!audio) return
  const settings: Record<SoundName, [OscillatorType, number, number, number]> = {
    shoot: ['square', 190, 90, 0.075],
    hit: ['triangle', 420, 230, 0.09],
    death: ['sawtooth', 210, 65, 0.25],
    'player-hit': ['sawtooth', 120, 55, 0.17],
    gate: ['sine', 250, 730, 0.48],
    level: ['triangle', 390, 780, 0.36],
    'game-over': ['triangle', 300, 75, 0.6],
    victory: ['sine', 480, 960, 0.7],
    empty: ['square', 115, 85, 0.07],
  }
  const [type, startFrequency, endFrequency, duration] = settings[name]
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, audio.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), audio.currentTime + duration)
  gain.gain.setValueAtTime(Math.max(0.001, volume), audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration)
  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + duration)
}
