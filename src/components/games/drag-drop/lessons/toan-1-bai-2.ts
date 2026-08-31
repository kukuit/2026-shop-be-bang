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
const count = (id: number, targetCount: number, forcedValue?: number): DragDropLevel => {
  const values = shuffle([6, 7, 8, 9, 10]).slice(0, targetCount)
  if (forcedValue) values[0] = forcedValue
  const groups = values.map((value, index) => ({ id: `count-${id}-${index}`, icon: ICONS[(id + index) % ICONS.length], count: value, label: 'đồ vật' }))
  return {
    id, type: 'count', title: targetCount === 1 ? `Nhận biết số ${values[0]}` : 'Đếm các nhóm đồ vật', instruction: 'Đếm rồi kéo số đúng vào mỗi nhóm', groups,
    answers: Object.fromEntries(groups.map((group) => [group.id, group.count])), learningKeys: Object.fromEntries(groups.map((group) => [group.id, recognize[group.count]])),
  }
}
const sequence = (id: number, backward: boolean, targetCount: number): DragDropLevel => {
  const values = backward ? [10, 9, 8, 7, 6] : [6, 7, 8, 9, 10]
  const targetIndexes = new Set(shuffle([1, 2, 3, 4]).slice(0, targetCount))
  const cells: SequenceCell[] = values.map((value, index) => ({ id: `seq-${id}-${index}`, value, target: targetIndexes.has(index) }))
  const targets = cells.filter((cell) => cell.target)
  const key = backward ? K.SEQUENCE_BACKWARD : K.SEQUENCE_FORWARD
  return { id, type: 'sequence', title: backward ? 'Dãy số ngược' : 'Dãy số xuôi', instruction: 'Kéo các số còn thiếu vào đúng chỗ', sequence: cells, answers: Object.fromEntries(targets.map((cell) => [cell.id, cell.value])), learningKeys: Object.fromEntries(targets.map((cell) => [cell.id, key])) }
}
const order = (id: number, targetCount: number): DragDropLevel => {
  const values = Math.random() < 0.5 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10]
  // Keep 0 or 6 visible as an anchor so children know which direction to complete the row.
  const targetIndexes = new Set(shuffle(values.slice(1).map((_, index) => index + 1)).slice(0, targetCount))
  const cells = values.map((value, index) => ({ id: `order-${index}`, value, target: targetIndexes.has(index) }))
  const targets = cells.filter((cell) => cell.target)
  return { id, type: 'sort', title: 'Sắp xếp các số', instruction: 'Kéo các số theo thứ tự từ bé đến lớn', sequence: cells, answers: Object.fromEntries(targets.map((cell) => [cell.id, cell.value])), learningKeys: Object.fromEntries(targets.map((cell) => [cell.id, K.ORDER_NUMBERS])) }
}
const complete = (id: number, current: number, goal: number): DragDropLevel => ({
  id, type: 'count', title: 'Thêm cho đủ', instruction: `Có ${current} cái bánh. Kéo số cần thêm để đủ ${goal}`,
  groups: [{ id: `complete-${id}`, icon: '🧁', count: current, label: 'cái bánh hiện có' }],
  answers: { [`complete-${id}`]: goal - current }, learningKeys: { [`complete-${id}`]: K.COMPLETE_QUANTITY },
})

const createRandomLevels = (): DragDropLevel[] => {
  const firstGoal = randomInt(6, 10)
  return [
    count(1, 1),
    sequence(2, false, 1),
    complete(3, randomInt(1, firstGoal - 1), firstGoal),
    sequence(4, true, 1),
    count(5, 2),
    sequence(6, false, 2),
    count(7, 2),
    order(8, 2),
    count(9, 3),
    sequence(10, Math.random() < 0.5, 3),
  ]
}
const LEVELS = createRandomLevels()
const supported = [...Object.values(recognize), K.SEQUENCE_FORWARD, K.SEQUENCE_BACKWARD, K.COMPLETE_QUANTITY, K.ORDER_NUMBERS] as LearningKey[]
const forTarget = (target: LearningKey, index: number) => {
  const value = [6, 7, 8, 9, 10].find((candidate) => recognize[candidate] === target)
  const targetCount = index < 4 ? 1 : index < 8 ? 2 : 3
  if (value) return count(index + 1, targetCount, value)
  if (target === K.SEQUENCE_FORWARD) return sequence(index + 1, false, targetCount)
  if (target === K.SEQUENCE_BACKWARD) return sequence(index + 1, true, targetCount)
  if (target === K.ORDER_NUMBERS) return order(index + 1, targetCount)
  return createRandomLevels()[index % 10]
}

export const TOAN_1_BAI_2_DRAG_DROP_CONFIG: DragDropGameConfig = {
  lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.DRAG_DROP, totalRounds: 10,
  answerDomain: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], supportedTargets: supported,
  initialLevels: LEVELS,
  loadLevels: async () => {
    const random = createRandomLevels()
    const levels = await buildAdaptiveQuestions({ lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.DRAG_DROP, supportedTargets: supported, totalRounds: 10, generateRandomQuestion: (index) => random[index], generateQuestionForTarget: forTarget })
    return levels.sort((left, right) => left.id - right.id)
  },
}
