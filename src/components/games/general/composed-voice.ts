/** A recorded fragment of a sentence. Playback waits for each fragment to end. */
export type VoiceSegment = { src: string; text: string; playbackRate?: number }

export function normalizeVoiceText(text: string): string {
  return text.normalize('NFC').toLocaleLowerCase('vi').replace(/[.,!?;:“”"']/g, '').replace(/\s+/g, ' ').trim()
}

/** Build a sentence from at least two recordings; never return a partial sentence.
 * Single recordings belong to the caller's normal single-voice path.
 * Pass the result to QuestionVoicePlayer.playSequence for sequential playback.
 */
export function createComposedVoiceSequence(
  text: string,
  recordings: Readonly<Record<string, VoiceSegment>>,
): VoiceSegment[] | undefined {
  let remaining = normalizeVoiceText(text)
  const phrases = Object.keys(recordings).filter(Boolean).sort((a, b) => b.length - a.length)
  const sequence: VoiceSegment[] = []
  while (remaining) {
    const phrase = phrases.find(part => remaining === part || remaining.startsWith(`${part} `))
    if (!phrase) return undefined
    sequence.push({ ...recordings[phrase] })
    remaining = remaining.slice(phrase.length).trimStart()
  }
  return sequence.length >= 2 ? sequence : undefined
}
