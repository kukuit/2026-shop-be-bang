export const ASK_PROGRESS_TAG = '[ASK_LEARNING_PROGRESS]'
export const PROGRESS_DETAILS_TAG = '[LEARNING_PROGRESS_DETAILS]'
export const PROGRESS_QUESTION = 'Có phải bạn muốn xem tiến trình học của bé?'
export const PROGRESS_SUBJECTS = { toan: 'Toán', 'tieng-anh': 'Tiếng Anh', 'tieng-viet': 'Tiếng Việt' } as const
export type ProgressSubject = keyof typeof PROGRESS_SUBJECTS

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')

export function progressSubjectFromText(text: string): ProgressSubject | undefined {
  const normalized = normalize(text)
  if (/tieng anh/.test(normalized)) return 'tieng-anh'
  if (/tieng viet/.test(normalized)) return 'tieng-viet'
  if (/\btoan\b/.test(normalized)) return 'toan'
}

export function isProgressRequest(text: string) {
  return /tien (trinh|do)|qua trinh hoc|ket qua hoc|hoc (den dau|the nao|ra sao)|hoan thanh.*(bao nhieu|%)|lich su (hoc|choi)/.test(normalize(text))
}

export function isProgressDetailRequest(text: string) {
  return /chi tiet|cu the|tung bai|xem them|diem so|dung.{0,10}sai|ket qua/.test(normalize(text))
}

export type ProgressLesson = {
  id: string
  subjectId: ProgressSubject
  title: string
  practiced: number
  total: number
  percent: number
  sessions: number
  goals?: { title: string; attempts: number; correct: number; wrong: number }[]
}

export type ProgressReport = {
  grade: number
  subject?: ProgressSubject
  percent: number
  practiced: number
  total: number
  lessons: ProgressLesson[]
}

export function formatProgress(report: ProgressReport, detail: boolean) {
  const heading = report.practiced
    ? `Bé đang học lớp ${report.grade}. Bé đã luyện ${report.percent}% mục tiêu (${report.practiced}/${report.total}) trong các bài${report.subject ? ` môn ${PROGRESS_SUBJECTS[report.subject]}` : ''} đang được theo dõi của lớp ${report.grade}.`
    : `Bé đang học lớp ${report.grade}. Chưa ghi nhận quá trình học của bé trong các bài${report.subject ? ` môn ${PROGRESS_SUBJECTS[report.subject]}` : ''} đang được theo dõi của lớp này.`
  return [heading, 'Phần trăm tính theo số mục tiêu đã trả lời ít nhất một lần, không phải tỷ lệ thành thạo.',
    ...Object.entries(PROGRESS_SUBJECTS).filter(([id]) => !report.subject || report.subject === id).map(([id, label]) => {
      const lessons = report.lessons.filter(lesson => lesson.subjectId === id)
      if (!lessons.length) return `${label} - Chưa có bài học được theo dõi ở lớp ${report.grade}.`
      return `${label} -\n` + lessons.map(lesson => [
      `${lesson.title}: ${lesson.percent}% mục tiêu đã luyện (${lesson.practiced}/${lesson.total}), ${lesson.sessions} lượt chơi.`,
      ...(lesson.goals?.map(goal => `${goal.title}: ${goal.attempts ? `${goal.correct} đúng, ${goal.wrong} sai / ${goal.attempts} lần trả lời` : 'chưa luyện'}.`) ?? []),
    ].join('\n')).join('\n')
    }),
    detail ? '' : 'Bạn có muốn biết thêm chi tiết từng môn không?',
  ].filter(Boolean).join('\n\n')
}
