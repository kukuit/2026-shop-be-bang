import type { DragDropLevel, NumberValue, SequenceCell } from './types'

const sequence = (targets: NumberValue[]): SequenceCell[] =>
  ([0, 1, 2, 3, 4, 5] as NumberValue[]).map((value) => ({ id: `sequence-${value}`, value, target: targets.includes(value) }))

export const DRAG_DROP_LEVELS: DragDropLevel[] = [
  { id: 1, type: 'count', title: 'Đếm con vật', instruction: 'Có bao nhiêu chú gà?', groups: [{ id: 'chicken', icon: '🐔', count: 1, label: 'chú gà' }], answers: { chicken: 1 } },
  { id: 2, type: 'count', title: 'Đếm thật nhanh', instruction: 'Có bao nhiêu chú ong?', groups: [{ id: 'bee', icon: '🐝', count: 3, label: 'chú ong' }], answers: { bee: 3 } },
  { id: 3, type: 'count', title: 'Hai nhóm đáng yêu', instruction: 'Kéo số đúng vào mỗi nhóm', groups: [{ id: 'rabbit', icon: '🐰', count: 2, label: 'chú thỏ' }, { id: 'fish', icon: '🐟', count: 4, label: 'chú cá' }], answers: { rabbit: 2, fish: 4 } },
  { id: 4, type: 'count', title: 'Bể cá bí mật', instruction: 'Bể trống có mấy chú cá?', groups: [{ id: 'empty-fish', icon: '🐟', count: 0, label: 'bể cá trống' }, { id: 'fish-three', icon: '🐟', count: 3, label: 'chú cá' }], answers: { 'empty-fish': 0, 'fish-three': 3 } },
  { id: 5, type: 'count', title: 'Ba nhóm vui nhộn', instruction: 'Đếm rồi chọn số đúng', groups: [{ id: 'dog', icon: '🐶', count: 1, label: 'chú chó' }, { id: 'duck', icon: '🦆', count: 2, label: 'chú vịt' }, { id: 'ball', icon: '🏐', count: 5, label: 'quả bóng' }], answers: { dog: 1, duck: 2, ball: 5 } },
  { id: 6, type: 'sequence', title: 'Đoàn tàu số', instruction: 'Tìm những số còn thiếu', sequence: sequence([2, 4]), answers: { 'sequence-2': 2, 'sequence-4': 4 } },
  { id: 7, type: 'sequence', title: 'Đoàn tàu thử thách', instruction: 'Tìm những số còn thiếu', sequence: sequence([0, 2, 4]), answers: { 'sequence-0': 0, 'sequence-2': 2, 'sequence-4': 4 } },
  { id: 8, type: 'count', title: 'Quan sát thật tinh', instruction: 'Đếm từng nhóm con nhé', groups: [{ id: 'cow', icon: '🐮', count: 2, label: 'chú bò' }, { id: 'hen', icon: '🐔', count: 3, label: 'chú gà' }, { id: 'cloud', icon: '☁️', count: 4, label: 'đám mây' }, { id: 'parrot', icon: '🦜', count: 1, label: 'chú vẹt' }, { id: 'fruit', icon: '🍎', count: 5, label: 'trái cây' }], answers: { cow: 2, hen: 3, cloud: 4, parrot: 1, fruit: 5 } },
  { id: 9, type: 'sort', title: 'Xếp đúng thứ tự', instruction: 'Xếp các số từ 0 đến 5', sequence: sequence([0, 1, 2, 3, 4, 5]), answers: { 'sequence-0': 0, 'sequence-1': 1, 'sequence-2': 2, 'sequence-3': 3, 'sequence-4': 4, 'sequence-5': 5 } },
  { id: 10, type: 'mixed', title: 'Thử thách cuối cùng!', instruction: 'Bé cố lên nhé!', groups: [{ id: 'boss-cow', icon: '🐮', count: 2, label: 'chú bò' }, { id: 'boss-duck', icon: '🦆', count: 5, label: 'chú vịt' }, { id: 'boss-empty', icon: '🐟', count: 0, label: 'bể cá trống' }], sequence: sequence([2, 4]), answers: { 'boss-cow': 2, 'boss-duck': 5, 'boss-empty': 0, 'sequence-2': 2, 'sequence-4': 4 } },
]

export const NUMBER_COLORS = ['#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#a855f7']
