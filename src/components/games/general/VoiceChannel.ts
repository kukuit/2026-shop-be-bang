/** Keeps question narration waiting while an intro or feedback voice is pending/playing. */
export class VoiceChannel {
  private reasons = new Set<string>()
  private listeners = new Set<(busy: boolean) => void>()
  get busy() { return this.reasons.size > 0 }
  set(reason: string, active: boolean) {
    if (active) this.reasons.add(reason)
    else this.reasons.delete(reason)
    this.listeners.forEach((listener) => listener(this.busy))
  }
  subscribe(listener: (busy: boolean) => void) {
    this.listeners.add(listener)
    listener(this.busy)
    return () => { this.listeners.delete(listener) }
  }
}
const channels = new WeakMap<object, VoiceChannel>()
export function getVoiceChannel(owner: object) {
  let channel = channels.get(owner)
  if (!channel) { channel = new VoiceChannel(); channels.set(owner, channel) }
  return channel
}
