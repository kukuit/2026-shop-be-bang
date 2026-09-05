import type { LearningQuestion } from '@/components/games/general/learning-question'
import { TIENG_ANH_1_BAI_1_LEARNING_KEYS as K } from './lesson'

const ROOT = '/games/lessons/lop-1/tieng-anh/bai-1'
export const TIENG_ANH_1_BAI_1_VOCABULARY = {
  ball: { id: 'ball', text: 'ball', symbol: '⚽', image: `${ROOT}/images/ball.png`, voice: `${ROOT}/voices/ball.mp3`, goalKey: K.RECOGNIZE_BALL },
  bill: { id: 'bill', text: 'Bill', symbol: '👦', image: `${ROOT}/images/bill.png`, voice: `${ROOT}/voices/bill.mp3`, goalKey: K.RECOGNIZE_BILL },
  book: { id: 'book', text: 'book', symbol: '📘', image: `${ROOT}/images/book.png`, voice: `${ROOT}/voices/book.mp3`, goalKey: K.RECOGNIZE_BOOK },
  bike: { id: 'bike', text: 'bike', symbol: '🚲', image: `${ROOT}/images/bike.png`, voice: `${ROOT}/voices/bike.mp3`, goalKey: K.RECOGNIZE_BIKE },
} as const

export const TIENG_ANH_1_BAI_1_PATTERNS = {
  greeting: { id: 'greeting', text: "Hi, I'm Bill.", symbol: '👋🙂', scene: `${ROOT}/images/greeting.png`, voice: `${ROOT}/voices/hi.mp3`, goalKey: K.GREETING_HI_IM },
  farewell: { id: 'farewell', text: 'Bye, Bill.', symbol: '🙂👋', scene: `${ROOT}/images/farewell.png`, voice: `${ROOT}/voices/bye.mp3`, goalKey: K.FAREWELL_BYE },
} as const

const V = TIENG_ANH_1_BAI_1_VOCABULARY
const P = TIENG_ANH_1_BAI_1_PATTERNS
export const TIENG_ANH_1_BAI_1_QUESTION_POOL: LearningQuestion[] = [
  ...Object.values(V).flatMap((item) => [
    { id: `${item.id}-listen-image`, goalKey: item.goalKey, skill: 'listening' as const, inputMode: 'audio' as const, answerMode: 'select-image' as const, questionType: 'listen-select-image', prompt: '🔊 Nghe và chọn', instructionVoice: '/games/general/voices/be_hay_nghe_va_chon_nhe.mp3', voice: item.voice, answer: item.symbol, options: [V.ball.symbol, V.book.symbol, V.bike.symbol, V.bill.symbol] },
    { id: `${item.id}-read-word`, goalKey: item.goalKey, skill: 'reading' as const, inputMode: 'text' as const, answerMode: 'select-image' as const, questionType: 'word-select-image', prompt: item.text, instructionVoice: '/games/general/voices/be_hay_chon_hinh_dung_nhe.mp3', answer: item.symbol, options: [V.ball.symbol, V.book.symbol, V.bike.symbol, V.bill.symbol] },
    { id: `${item.id}-image-word`, goalKey: item.goalKey, skill: 'reading' as const, inputMode: 'image' as const, answerMode: 'select-text' as const, questionType: 'image-select-word', prompt: item.symbol, instructionVoice: '/games/general/voices/be_hay_chon_tu_dung_nhe.mp3', answer: item.text, options: [V.ball.text, V.book.text, V.bike.text, V.bill.text] },
  ]),
  ...Object.values(P).flatMap((item) => [
    { id: `${item.id}-listen-scene`, goalKey: item.goalKey, skill: 'listening' as const, inputMode: 'audio' as const, answerMode: 'select-image' as const, questionType: 'listen-select-scene', prompt: '🔊 Nghe và chọn', instructionVoice: '/games/general/voices/be_hay_nghe_va_chon_nhe.mp3', voice: item.voice, answer: item.symbol, options: [P.greeting.symbol, P.farewell.symbol, '📚🙂', '🚲🙂'] },
    { id: `${item.id}-read-scene`, goalKey: item.goalKey, skill: 'reading' as const, inputMode: 'text' as const, answerMode: 'select-image' as const, questionType: 'word-select-image', prompt: item.text, instructionVoice: '/games/general/voices/be_hay_chon_hinh_dung_nhe.mp3', answer: item.symbol, options: [P.greeting.symbol, P.farewell.symbol, '📚🙂', '🚲🙂'] },
  ]),
]

export const createEnglishQuestions = (count = 10) => {
  const pool = [...TIENG_ANH_1_BAI_1_QUESTION_POOL].sort(() => Math.random() - .5)
  const goals = Array.from(new Set(pool.map((question) => question.goalKey)))
  const required = goals.map((goal) => pool.find((question) => question.goalKey === goal)!)
  return [...required, ...pool.filter((question) => !required.includes(question))].slice(0, count).sort(() => Math.random() - .5)
}
