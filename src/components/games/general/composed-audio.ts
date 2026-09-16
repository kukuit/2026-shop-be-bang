import type { VoiceSegment } from './composed-voice'
import { normalizeVoiceText } from './composed-voice'
import { NUMBER_VOICE_FILES } from './number-voice'

/** Join “số” (also at the end of an instruction) closely to its spoken number. */
export function isNumberIntroduction(left?: VoiceSegment, right?: VoiceSegment): boolean {
  if (!left || !right) return false
  return /(?:^| )số$/.test(normalizeVoiceText(left.text))
    && Object.prototype.hasOwnProperty.call(NUMBER_VOICE_FILES, normalizeVoiceText(right.text))
}

type PCM = Pick<AudioBuffer, 'sampleRate' | 'length' | 'numberOfChannels' | 'getChannelData'>
export type SpeechBounds = { start: number; end: number }

/** Measure 5 ms RMS windows, keeping all sound between the first and last active window. */
export function detectSpeechBounds(buffer: PCM): SpeechBounds {
  const size = Math.max(1, Math.round(buffer.sampleRate * .005))
  const energy = new Float32Array(Math.ceil(buffer.length / size))
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < energy.length; i++) {
      const end = Math.min((i + 1) * size, data.length)
      let sum = 0
      for (let j = i * size; j < end; j++) sum += data[j] * data[j]
      energy[i] = Math.max(energy[i], Math.sqrt(sum / (end - i * size)))
    }
  }
  let peak = 0
  for (let i = 0; i < energy.length; i++) peak = Math.max(peak, energy[i])
  const full = { start: 0, end: buffer.length / buffer.sampleRate }
  if (peak < .0001) return full
  // Conservative relative threshold (-40 dB below peak); preserve quiet consonants.
  const threshold = Math.max(.0001, peak * .01)
  const first = energy.findIndex(value => value >= threshold)
  let last = energy.length - 1
  while (last > first && energy[last] < threshold) last--
  return { start: first * size / buffer.sampleRate, end: Math.min(full.end, (last + 1) * size / buffer.sampleRate) }
}

type CachedAudio = { buffer: AudioBuffer; bounds: SpeechBounds }
export type ComposedAudioOptions = { paddingMs?: number; gapMs?: number }
export type SegmentMeasurement = { text: string; durationMs: number; trimmedStartMs: number; trimmedEndMs: number }

/** Shared composed playback with per-recording cache and silence-aware joins. */
export class ComposedAudioPlayer {
  private context?: AudioContext
  private cache = new Map<string, Promise<CachedAudio>>()
  private sources: AudioBufferSourceNode[] = []
  private gains: GainNode[] = []
  private generation = 0
  private disposed = false
  private blocked = false

  setBlocked(blocked: boolean) {
    this.blocked = blocked
    if (!this.context || this.disposed) return
    void (blocked ? this.context.suspend() : this.context.resume()).catch(() => undefined)
  }

  private getContext() {
    if (this.disposed) throw new Error('Bộ phát đã đóng.')
    if (!this.context) this.context = new AudioContext()
    return this.context
  }

  private load(src: string): Promise<CachedAudio> {
    const existing = this.cache.get(src)
    if (existing) return existing
    const context = this.getContext()
    const pending = fetch(src).then(async response => {
      if (!response.ok) throw new Error(`Không tải được voice (${response.status}): ${src}`)
      const buffer = await context.decodeAudioData(await response.arrayBuffer())
      return { buffer, bounds: detectSpeechBounds(buffer) }
    }).catch(error => { this.cache.delete(src); throw error })
    this.cache.set(src, pending)
    return pending
  }

  async play(sequence: VoiceSegment[], options: ComposedAudioOptions = {}, onEnded?: () => void): Promise<SegmentMeasurement[]> {
    this.stop()
    const generation = this.generation
    if (sequence.length < 2) throw new Error('Voice ghép cần ít nhất hai đoạn.')
    const context = this.getContext()
    // Resume synchronously from the user's click before awaiting network requests.
    const resumed = this.blocked ? context.suspend() : context.resume()
    const [, clips] = await Promise.all([resumed, Promise.all(sequence.map(segment => this.load(segment.src)))])
    if (generation !== this.generation) return []
    const padding = Math.max(0, Math.min(100, options.paddingMs ?? 15)) / 1000
    const gap = Math.max(0, Math.min(200, options.gapMs ?? 0)) / 1000
    let when = context.currentTime + .03
    const measurements: SegmentMeasurement[] = []
    try {
      clips.forEach(({ buffer, bounds }, index) => {
        const tightBefore = isNumberIntroduction(sequence[index - 1], sequence[index])
        const tightAfter = isNumberIntroduction(sequence[index], sequence[index + 1])
        // Keep 3 ms protection on each side, without the normal inter-segment pause.
        const start = Math.max(0, bounds.start - (tightBefore ? Math.min(padding, .003) : padding))
        // The last word has no following clip to join: preserve its complete release
        // and natural trailing silence instead of ending the sentence at the gate.
        const end = index === clips.length - 1 ? buffer.duration
          : Math.min(buffer.duration, bounds.end + (tightAfter ? Math.min(padding, .003) : padding))
        const rate = sequence[index].playbackRate ?? 1
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('Tốc độ đọc không hợp lệ.')
        const duration = (end - start) / rate
        const fade = Math.min(.003, duration / 4)
        const source = context.createBufferSource()
        const gain = context.createGain()
        source.buffer = buffer
        source.playbackRate.value = rate
        source.connect(gain)
        gain.connect(context.destination)
        gain.gain.setValueAtTime(0, when)
        gain.gain.linearRampToValueAtTime(.8, when + fade)
        gain.gain.setValueAtTime(.8, when + duration - fade)
        gain.gain.linearRampToValueAtTime(0, when + duration)
        this.sources.push(source)
        this.gains.push(gain)
        source.onended = () => {
          source.disconnect()
          gain.disconnect()
          if (index === clips.length - 1 && generation === this.generation) {
            this.sources = []
            this.gains = []
            onEnded?.()
          }
        }
        source.start(when, start, end - start)
        measurements.push({ text: sequence[index].text, durationMs: buffer.duration * 1000,
          trimmedStartMs: start * 1000, trimmedEndMs: (buffer.duration - end) * 1000 })
        when += duration + (tightAfter ? 0 : gap)
      })
    } catch (error) { this.stop(); throw error }
    return measurements
  }

  stop() {
    this.generation++
    for (const source of this.sources) {
      source.onended = null
      source.stop()
      source.disconnect()
    }
    for (const gain of this.gains) gain.disconnect()
    this.sources = []
    this.gains = []
  }

  dispose() {
    this.stop()
    this.disposed = true
    this.cache.clear()
    void this.context?.close().catch(() => undefined)
  }
}
