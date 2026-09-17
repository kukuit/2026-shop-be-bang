import type { LearningQuestion } from '../general/learning-question'
import type { LearningKey } from '../general/tracking'

export type VocabularyLesson = {
 vocabulary: readonly { word: string; symbol: string; goalKey: LearningKey }[]
 review: readonly { word: string; symbol: string }[]
 voiceRoot: string
 sentencePrefix: string
 sentenceVoicePrefix: string
 letter: string
 letterDistractors: string[]
 sound: string
 soundDistractors: string[]
 goals: { match: LearningKey; listen: LearningKey; understand: LearningKey; complete: LearningKey; sound: LearningKey; letter: LearningKey }
}

export function createVocabularyQuestionPool({ vocabulary, review, voiceRoot, sentencePrefix, sentenceVoicePrefix, letter, letterDistractors, sound, soundDistractors, goals }: VocabularyLesson): LearningQuestion[] {
const all = [...vocabulary, ...review]
const words = all.map(v => v.word)
const pictures = all.map(v => v.symbol)
const instruction = '/games/general/voices/'

return [
  ...vocabulary.flatMap((v): LearningQuestion[] => [
    { id: `${v.word}-read`, goalKey: v.goalKey, skill: 'reading', inputMode: 'text', answerMode: 'select-image', prompt: v.word, answer: v.symbol, options: pictures, instructionVoice: `${instruction}be_hay_chon_hinh_dung_nhe.mp3` },
    { id: `${v.word}-picture`, goalKey: v.goalKey, skill: 'reading', inputMode: 'image', answerMode: 'select-text', prompt: v.symbol, answer: v.word, options: words, instructionVoice: `${instruction}be_hay_chon_tu_dung_nhe.mp3` },
    { id: `${v.word}-listen`, goalKey: v.goalKey, skill: 'listening', inputMode: 'audio', answerMode: 'select-image', prompt: '🔊 Nghe và chọn', voice: `${voiceRoot}/${v.word}.wav`, answer: v.symbol, options: pictures, instructionVoice: `${instruction}be_hay_nghe_va_chon_nhe.mp3` },
    { id: `${v.word}-match`, goalKey: goals.match, skill: 'reading', inputMode: 'text', answerMode: 'select-image', prompt: v.word, answer: v.symbol, options: pictures, instructionVoice: `${instruction}be_hay_chon_hinh_dung_nhe.mp3` },
    { id: `${v.word}-identify`, goalKey: goals.listen, skill: 'listening', inputMode: 'audio', answerMode: 'select-image', prompt: '🔊 Nghe và chọn', voice: `${voiceRoot}/${sentenceVoicePrefix}${v.word}.wav`, answer: v.symbol, options: pictures, instructionVoice: `${instruction}be_hay_nghe_va_chon_nhe.mp3` },
    { id: `${v.word}-understand`, goalKey: goals.understand, skill: 'reading', inputMode: 'text', answerMode: 'select-image', prompt: `${sentencePrefix} ${v.word}.`, answer: v.symbol, options: pictures, instructionVoice: `${instruction}be_hay_chon_hinh_dung_nhe.mp3` },
    { id: `${v.word}-complete`, goalKey: goals.complete, skill: 'listening', inputMode: 'audio', answerMode: 'select-text', prompt: `${sentencePrefix} ___.`, voice: `${voiceRoot}/${sentenceVoicePrefix}${v.word}.wav`, answer: v.word, options: words, instructionVoice: `${instruction}be_hay_nghe_va_chon_nhe.mp3` },
    { id: `${v.word}-sound`, goalKey: goals.sound, skill: 'listening', inputMode: 'audio', answerMode: 'select-text', prompt: 'Âm đầu của từ vừa nghe là gì?', voice: `${voiceRoot}/${v.word}.wav`, answer: sound, options: [sound, ...soundDistractors] },
  ]),
  ...([letter.toUpperCase(), letter.toLowerCase()]).map((value, index): LearningQuestion => ({
    id: `letter-${value}`, goalKey: goals.letter, skill: 'reading', inputMode: 'text', answerMode: 'select-text',
    prompt: index === 0 ? `Chữ nào là chữ ${letter.toLowerCase()} viết hoa?` : `Chữ nào là chữ ${letter.toUpperCase()} viết thường?`,
    answer: value, options: [value, ...letterDistractors.map(v => index === 0 ? v.toUpperCase() : v.toLowerCase())],
  })),
  ...review.map((v): LearningQuestion => ({
    id: `${v.word}-review-sentence`, goalKey: goals.understand, skill: 'reading', inputMode: 'text', answerMode: 'select-image',
    prompt: `${sentencePrefix} ${v.word}.`, answer: v.symbol, options: pictures, instructionVoice: `${instruction}be_hay_chon_hinh_dung_nhe.mp3`,
  })),
]

}
