import { NUMBER_VOICE_FILES, numberWordVoice } from './number-voice'
/** Shared Vietnamese math recordings. Keep filenames in sync with docs/math-voices.md. */
export const MATH_VOICE_FILES: Record<string, string> = {
  'hãy kéo cách đọc đúng của số trên bảng vào ô': 'hay-keo-cach-doc-dung',
  'gồm mấy chục và mấy đơn vị': 'gom-may-chuc-va-may-don-vi',
  'hãy kéo cách phân tích đúng của số': 'hay-keo-cach-phan-tich-dung-cua-so',
  'hãy kéo các thẻ để tạo số': 'hay-keo-cac-the-de-tao-so',
  ...NUMBER_VOICE_FILES,
  'hãy chọn số': 'hay-chon-so', 'số': 'so',
  'có mấy chục': 'co-may-chuc', 'có mấy đơn vị': 'co-may-don-vi',
  'chục và': 'chuc-va', 'đơn vị là số nào': 'don-vi-la-so-nao',
  'bằng mấy cộng': 'bang-may-cong', 'bằng': 'bang', 'cộng mấy': 'cong-may',
  'hãy tìm số lớn hơn': 'hay-tim-so-lon-hon',
  'hãy tìm số bé hơn': 'hay-tim-so-be-hon', 'và bé hơn': 'va-be-hon',
  'hãy chọn số bé nhất trong các đáp án': 'hay-tim-so-be-nhat',
  'hãy chọn số lớn nhất trong các đáp án': 'hay-tim-so-lon-nhat',
}

const phrases = Object.keys(MATH_VOICE_FILES).sort((a, b) => b.length - a.length)

/** Input uses spoken numbers (e.g. "hai mươi tư"). Unknown text falls back to TTS as a whole. */
export function createMathVoiceSequence(text: string): Array<{ src: string; text: string; playbackRate?: number }> | undefined {
  let remaining = text.normalize('NFC').toLocaleLowerCase('vi').replace(/[.,!?;:“”"']/g, '').replace(/\s+/g, ' ').trim()
  const sequence: Array<{ src: string; text: string; playbackRate?: number }> = []

  while (remaining) {
    const phrase = phrases.find(part => remaining === part || remaining.startsWith(`${part} `))
    if (!phrase) return undefined
    sequence.push(numberWordVoice(phrase) ?? {
      src: `/games/general/voices/toan/${MATH_VOICE_FILES[phrase]}.mp3`, text: phrase, playbackRate: 1,
    })
    remaining = remaining.slice(phrase.length).trimStart()
  }
  return sequence.length ? sequence : undefined
}
