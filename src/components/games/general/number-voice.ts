/** Shared Vietnamese number reading and recordings (0–100), independent of any game. */
export const NUMBER_VOICE_FILES: Record<string, string> = {
  'không': 'khong', 'một': 'mot', 'hai': 'hai', 'ba': 'ba', 'bốn': 'bon',
  'năm': 'nam', 'sáu': 'sau', 'bảy': 'bay', 'tám': 'tam', 'chín': 'chin',
  'mười': 'muoi', 'mươi': 'muoi-hang-chuc', 'mốt': 'mot-hang-don-vi',
  'tư': 'tu', 'lăm': 'lam', 'trăm': 'tram',
}
const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

export function readNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new RangeError('Expected a number from 0 to 100')
  if (n === 100) return 'một trăm'
  if (n < 10) return digits[n]
  const tens = Math.floor(n / 10), ones = n % 10
  const prefix = tens === 1 ? 'mười' : `${digits[tens]} mươi`
  return prefix + (ones === 0 ? '' : ` ${ones === 5 ? 'lăm' : tens > 1 && ones === 1 ? 'mốt' : tens > 1 && ones === 4 ? 'tư' : digits[ones]}`)
}

export function numberWordVoice(word: string) {
  const filename = NUMBER_VOICE_FILES[word]
  return filename ? { src: `/games/general/voices/toan/${filename}.mp3`, text: word, playbackRate: 1 } : undefined
}

/** Pass to QuestionVoicePlayer.playSequence: each file ends before the next starts. */
export function createNumberVoiceSequence(n: number) {
  return readNumber(n).split(' ').map(word => numberWordVoice(word)!)
}
