import { TOAN_1_BAI_2_LEARNING_KEYS as K } from '@/app/game/lop-1/toan/bai-2/lesson'
import { buildAdaptiveQuestions } from '../../general/adaptive'
import { GAME_IDS, LESSON_IDS, type LearningKey } from '../../general/tracking'
import type { DragDropGameConfig, DragDropLevel, SequenceCell } from '../types'

const recognize: Record<number, LearningKey> = { 6: K.RECOGNIZE_NUMBER_6, 7: K.RECOGNIZE_NUMBER_7, 8: K.RECOGNIZE_NUMBER_8, 9: K.RECOGNIZE_NUMBER_9, 10: K.RECOGNIZE_NUMBER_10 }
const ICONS = ['🐝', '⭐', '🐟', '🍎', '🌸', '🐥', '⚽']
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}
const count = (id: number, value: number, icon: string): DragDropLevel => ({
  id, type: 'count', title: `Nhận biết số ${value}`, instruction: 'Đếm rồi kéo số đúng vào nhóm',
  groups: [{ id: `count-${id}`, icon, count: value, label: 'đồ vật' }],
  answers: { [`count-${id}`]: value }, learningKeys: { [`count-${id}`]: recognize[value] },
})
const sequence = (id: number, values: number[], missing: number, key: LearningKey): DragDropLevel => {
  const cells: SequenceCell[] = values.map((value, index) => ({ id: `seq-${id}-${index}`, value, target: value === missing }))
  const target = cells.find((cell) => cell.target)!
  return { id, type: 'sequence', title: key === K.SEQUENCE_BACKWARD ? 'Dãy số ngược' : 'Dãy số xuôi', instruction: 'Kéo số còn thiếu vào đúng chỗ', sequence: cells, answers: { [target.id]: target.value }, learningKeys: { [target.id]: key } }
}
const order = (id: number): DragDropLevel => {
  const length = randomInt(4, 6)
  const start = randomInt(0, 10 - length + 1)
  const values = Array.from({ length }, (_, index) => start + index)
  const cells = values.map((value, index) => ({ id: `order-${index}`, value, target: true }))
  return { id, type: 'sort', title: 'Sắp xếp các số', instruction: 'Kéo các số theo thứ tự từ bé đến lớn', sequence: cells, answers: Object.fromEntries(cells.map((cell) => [cell.id, cell.value])), learningKeys: Object.fromEntries(cells.map((cell) => [cell.id, K.ORDER_NUMBERS])) }
}
const complete = (id: number, current: number, goal: number): DragDropLevel => ({
  id, type: 'count', title: 'Thêm cho đủ', instruction: `Có ${current} cái bánh. Kéo số cần thêm để đủ ${goal}`,
  groups: [{ id: `complete-${id}`, icon: '🧁', count: current, label: 'cái bánh hiện có' }],
  answers: { [`complete-${id}`]: goal - current }, learningKeys: { [`complete-${id}`]: K.COMPLETE_QUANTITY },
})

const createRandomLevels = (): DragDropLevel[] => {
  const forwardStart = randomInt(0, 7)
  const forwardValues = Array.from({ length: 4 }, (_, index) => forwardStart + index)
  const backwardStart = randomInt(3, 10)
  const backwardValues = Array.from({ length: 4 }, (_, index) => backwardStart - index)
  const firstGoal = randomInt(6, 10)
  const secondGoal = randomInt(6, 10)
  const levels = [
    ...shuffle([6, 7, 8, 9, 10]).map((value, index) => count(index + 1, value, ICONS[Math.floor(Math.random() * ICONS.length)])),
    sequence(6, forwardValues, forwardValues[randomInt(1, 2)], K.SEQUENCE_FORWARD),
    sequence(7, backwardValues, backwardValues[randomInt(1, 2)], K.SEQUENCE_BACKWARD),
    order(8), complete(9, randomInt(1, firstGoal - 1), firstGoal), complete(10, randomInt(1, secondGoal - 1), secondGoal),
  ]
  return shuffle(levels).map((level, index) => ({ ...level, id: index + 1 }))
}
const LEVELS = createRandomLevels()
const supported = [...Object.values(recognize), K.SEQUENCE_FORWARD, K.SEQUENCE_BACKWARD, K.COMPLETE_QUANTITY, K.ORDER_NUMBERS] as LearningKey[]
const forTarget = (target: LearningKey, index: number) => {
  const value = [6, 7, 8, 9, 10].find((candidate) => recognize[candidate] === target)
  if (value) return count(index + 1, value, ICONS[Math.floor(Math.random() * ICONS.length)])
  const candidates = createRandomLevels().filter((level) => Object.values(level.learningKeys).includes(target))
  return { ...(candidates[0] ?? createRandomLevels()[index % 10]), id: index + 1 }
}

export const TOAN_1_BAI_2_DRAG_DROP_CONFIG: DragDropGameConfig = {
  lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.DRAG_DROP, totalRounds: 10,
  answerDomain: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], supportedTargets: supported,
  initialLevels: LEVELS,
  loadLevels: () => {
    const random = createRandomLevels()
    return buildAdaptiveQuestions({ lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.DRAG_DROP, supportedTargets: supported, totalRounds: 10, generateRandomQuestion: (index) => random[index], generateQuestionForTarget: forTarget })
  },
}
