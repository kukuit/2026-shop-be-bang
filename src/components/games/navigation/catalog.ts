export const gradeItems = [
  { title: 'Lớp 1', href: '/game/lop-1' },
  { title: 'Lớp 2', href: '/game/lop-2' },
] as const

export function getSubjectItems(gradeSlug: 'lop-1' | 'lop-2') {
  return [
    { title: 'Toán', href: `/game/${gradeSlug}/toan` },
    { title: 'Tiếng Việt', href: `/game/${gradeSlug}/tieng-viet` },
    { title: 'Tiếng Anh', href: `/game/${gradeSlug}/tieng-anh` },
  ] as const
}

export function getMathLessonItems(gradeSlug: 'lop-1' | 'lop-2') {
  return [
    { title: 'Bài 1', href: `/game/${gradeSlug}/toan/bai-1` },
    { title: 'Bài 2', href: `/game/${gradeSlug}/toan/bai-2` },
  ] as const
}
