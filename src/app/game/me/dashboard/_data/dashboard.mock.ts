import type { Game, Lesson, Student, StudentRecord, Subject } from './types'

// Chỉ phản ánh catalog hiện có trong source game. Không chứa điểm hoặc hoạt động giả.
export const students: Student[] = [
  { id: 'no-data', name: 'Chưa có dữ liệu', avatar: '—', currentGrade: 1 },
]

export const subjects: Subject[] = [{ id: 'math', name: 'Toán' }]

const skillKeys = [
  'recognize-number-0',
  'recognize-number-1',
  'recognize-number-2',
  'recognize-number-3',
  'recognize-number-4',
  'recognize-number-5',
]

export const games: Game[] = [
  { id: 'drag-drop', name: 'Drag & Drop', path: '/game/lop-1/toan/bai-1/drag-drop', skillKeys },
  { id: 'gold-mining', name: 'Gold Mining', path: '/game/lop-1/toan/bai-1/gold-mining', skillKeys },
  { id: 'racing', name: 'Racing', path: '/game/lop-1/toan/bai-1/racing', skillKeys },
]

const lessons: Lesson[] = [
  {
    id: 'toan-1-bai-1',
    order: 1,
    grade: 1,
    subjectId: 'math',
    title: 'Nhận biết số từ 0 đến 5',
    progress: 0,
    objectives: [
      {
        id: 'recognize-numbers-0-5',
        title: 'Nhận biết số từ 0 đến 5',
        score: 0,
        status: 'no_data',
        trend: 'Chưa có dữ liệu',
        skillPerformance: {},
        games: [],
      },
    ],
  },
]

export const records: StudentRecord[] = [
  { studentId: 'no-data', grade: 1, lessons, recentActivities: [] },
]
