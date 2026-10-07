export const TIENG_VIET_1_WEEK_2_LEARNING_KEYS = {
  RECOGNIZE_O: 'RECOGNIZE_O', RECOGNIZE_O_CASE: 'RECOGNIZE_O_CASE', FIND_O_IN_TEXT: 'FIND_O_IN_TEXT',
  RECOGNIZE_O_CIRCUMFLEX: 'RECOGNIZE_O_CIRCUMFLEX', RECOGNIZE_O_CIRCUMFLEX_CASE: 'RECOGNIZE_O_CIRCUMFLEX_CASE', FIND_O_CIRCUMFLEX_IN_TEXT: 'FIND_O_CIRCUMFLEX_IN_TEXT',
  RECOGNIZE_O_HORN: 'RECOGNIZE_O_HORN', RECOGNIZE_O_HORN_CASE: 'RECOGNIZE_O_HORN_CASE', FIND_O_HORN_IN_TEXT: 'FIND_O_HORN_IN_TEXT',
  RECOGNIZE_D: 'RECOGNIZE_D', RECOGNIZE_D_CASE: 'RECOGNIZE_D_CASE', FIND_D_IN_TEXT: 'FIND_D_IN_TEXT',
  RECOGNIZE_D_DBAR: 'RECOGNIZE_D_DBAR', RECOGNIZE_D_DBAR_CASE: 'RECOGNIZE_D_DBAR_CASE', FIND_D_DBAR_IN_TEXT: 'FIND_D_DBAR_IN_TEXT',
  RECOGNIZE_HOI: 'RECOGNIZE_HOI', RECOGNIZE_NANG: 'RECOGNIZE_NANG', RECOGNIZE_NGA: 'RECOGNIZE_NGA',
  READ_O_SYLLABLES: 'READ_O_SYLLABLES', READ_O_CIRCUMFLEX_SYLLABLES: 'READ_O_CIRCUMFLEX_SYLLABLES',
  READ_O_HORN_SYLLABLES: 'READ_O_HORN_SYLLABLES', READ_D_SYLLABLES: 'READ_D_SYLLABLES', READ_D_DBAR_SYLLABLES: 'READ_D_DBAR_SYLLABLES',
  READ_WORDS_WEEK_2: 'READ_WORDS_WEEK_2', READ_SENTENCES_WEEK_2: 'READ_SENTENCES_WEEK_2',
} as const

export type VietnameseWeek2Goal = keyof typeof TIENG_VIET_1_WEEK_2_LEARNING_KEYS

export const TIENG_VIET_1_WEEK_2 = {
  // Persisted legacy key: retain existing progress until an explicit data migration is made.
  lessonId: 'tieng-viet-1-bai-2', gradeId: 'lop-1', gradeLabel: 'Lớp 1',
  subjectId: 'tieng-viet', subjectLabel: 'Tiếng Việt', lessonNumber: 2,
  title: 'Các chữ: O, Ô, Ơ, D, Đ',
  learningGoals: ([
    ['RECOGNIZE_O', 'Nhận biết chữ o'], ['RECOGNIZE_O_CASE', 'Phân biệt O hoa và o thường'], ['FIND_O_IN_TEXT', 'Chọn tiếng có chữ o'],
    ['RECOGNIZE_O_CIRCUMFLEX', 'Nhận biết chữ ô'], ['RECOGNIZE_O_CIRCUMFLEX_CASE', 'Phân biệt Ô hoa và ô thường'], ['FIND_O_CIRCUMFLEX_IN_TEXT', 'Chọn tiếng có chữ ô'],
    ['RECOGNIZE_O_HORN', 'Nhận biết chữ ơ'], ['RECOGNIZE_O_HORN_CASE', 'Phân biệt Ơ hoa và ơ thường'], ['FIND_O_HORN_IN_TEXT', 'Chọn tiếng có chữ ơ'],
    ['RECOGNIZE_D', 'Nhận biết chữ d'], ['RECOGNIZE_D_CASE', 'Phân biệt D hoa và d thường'], ['FIND_D_IN_TEXT', 'Chọn tiếng có chữ d'],
    ['RECOGNIZE_D_DBAR', 'Nhận biết chữ đ'], ['RECOGNIZE_D_DBAR_CASE', 'Phân biệt Đ hoa và đ thường'], ['FIND_D_DBAR_IN_TEXT', 'Chọn tiếng có chữ đ'],
    ['RECOGNIZE_HOI', 'Nhận biết dấu hỏi trong tiếng đã học'], ['RECOGNIZE_NANG', 'Nhận biết dấu nặng trong tiếng đã học'], ['RECOGNIZE_NGA', 'Nhận biết dấu ngã trong tiếng đã học'],
    ['READ_O_SYLLABLES', 'Đọc tiếng với o'], ['READ_O_CIRCUMFLEX_SYLLABLES', 'Đọc tiếng với ô'],
    ['READ_O_HORN_SYLLABLES', 'Đọc tiếng với ơ'], ['READ_D_SYLLABLES', 'Đọc tiếng với d'], ['READ_D_DBAR_SYLLABLES', 'Đọc tiếng với đ'],
    ['READ_WORDS_WEEK_2', 'Đọc từ và cụm từ trong tuần'], ['READ_SENTENCES_WEEK_2', 'Đọc câu ngắn trong tuần'],
  ] as const).map(([key, title]) => ({ key, title })),
  week: 2,
  sourceLessons: [6, 7, 8, 9, 10],
  storyMetadata: { title: 'Đàn kiến con ngoan ngoãn', sourceLesson: 10, includedInGameQuestions: false },
} as const

