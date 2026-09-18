import { createVocabularyQuestionPool } from '@/components/games/english/vocabulary-lesson'
import { sampleEnglishQuestions } from '@/components/games/english/question-generator'

const ROOT = '/games/lessons/lop-1/tieng-anh/bai-2'
export const TIENG_ANH_1_BAI_2_VOCABULARY = [
  { word: 'cup', symbol: '☕', goalKey: 'recognize_cup' },
  { word: 'cake', symbol: '🧁', goalKey: 'recognize_cake' },
  { word: 'cat', symbol: '🐱', goalKey: 'recognize_cat' },
  { word: 'car', symbol: '🚗', goalKey: 'recognize_car' },
] as const
const review = [{ word: 'ball', symbol: '⚽' }, { word: 'bike', symbol: '🚲' }, { word: 'book', symbol: '📘' }]
export const TIENG_ANH_1_BAI_2_QUESTION_POOL = createVocabularyQuestionPool({
 vocabulary: TIENG_ANH_1_BAI_2_VOCABULARY, review, voiceRoot: ROOT + '/voices',
 sentencePrefix: 'I have a', sentenceVoicePrefix: 'i-have-a-',
 letter: 'c', letterDistractors: ['b', 'd', 'g'], sound: '/k/', soundDistractors: ['/b/', '/m/', '/s/'],
 goals: { match: 'match_word_picture', listen: 'listen_and_identify', understand: 'understand_i_have_a', complete: 'complete_i_have_a', sound: 'recognize_c_sound', letter: 'recognize_letter_c' },
})

export const createEnglishQuestions = (count = 10) => sampleEnglishQuestions(TIENG_ANH_1_BAI_2_QUESTION_POOL, count)
