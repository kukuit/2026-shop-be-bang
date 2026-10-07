export const TIENG_VIET_1_WEEK_1_LEARNING_KEYS = {
  RECOGNIZE_A: 'RECOGNIZE_A', RECOGNIZE_A_CASE: 'RECOGNIZE_A_CASE', LISTEN_A: 'LISTEN_A', FIND_A_IN_TEXT: 'FIND_A_IN_TEXT', MATCH_A: 'MATCH_A',
  RECOGNIZE_B: 'RECOGNIZE_B', RECOGNIZE_B_CASE: 'RECOGNIZE_B_CASE', LISTEN_B: 'LISTEN_B', FIND_B_IN_TEXT: 'FIND_B_IN_TEXT', MATCH_B: 'MATCH_B',
  BUILD_BA: 'BUILD_BA', RECOGNIZE_HUYEN: 'RECOGNIZE_HUYEN', READ_B_WORDS: 'READ_B_WORDS',
  RECOGNIZE_C: 'RECOGNIZE_C', RECOGNIZE_C_CASE: 'RECOGNIZE_C_CASE', LISTEN_C: 'LISTEN_C', FIND_C_IN_TEXT: 'FIND_C_IN_TEXT', MATCH_C: 'MATCH_C',
  BUILD_CA: 'BUILD_CA', RECOGNIZE_SAC: 'RECOGNIZE_SAC', RECOGNIZE_TONES_CA: 'RECOGNIZE_TONES_CA', READ_C_WORDS: 'READ_C_WORDS',
  RECOGNIZE_E: 'RECOGNIZE_E', RECOGNIZE_E_CASE: 'RECOGNIZE_E_CASE', RECOGNIZE_E_CIRCUMFLEX: 'RECOGNIZE_E_CIRCUMFLEX', LISTEN_E_ECIRC: 'LISTEN_E_ECIRC', FIND_E_IN_TEXT: 'FIND_E_IN_TEXT', MATCH_E: 'MATCH_E',
  BUILD_B_E: 'BUILD_B_E', RECOGNIZE_E_WORDS: 'RECOGNIZE_E_WORDS', READ_E_WORDS: 'READ_E_WORDS',
  REVIEW_LETTERS_WEEK_1: 'REVIEW_LETTERS_WEEK_1', REVIEW_CASE_WEEK_1: 'REVIEW_CASE_WEEK_1', REVIEW_BUILD_SYLLABLES_WEEK_1: 'REVIEW_BUILD_SYLLABLES_WEEK_1',
  REVIEW_TONES_WEEK_1: 'REVIEW_TONES_WEEK_1', REVIEW_READ_WORDS_WEEK_1: 'REVIEW_READ_WORDS_WEEK_1', REVIEW_SENTENCE_WEEK_1: 'REVIEW_SENTENCE_WEEK_1',
} as const

export const TIENG_VIET_1_WEEK_1 = {
  // Persisted legacy key: retain existing progress until an explicit data migration is made.
  lessonId: 'tieng-viet-1-bai-1', gradeId: 'lop-1', gradeLabel: 'Lớp 1',
  subjectId: 'tieng-viet', subjectLabel: 'Tiếng Việt', lessonNumber: 1,
  title: 'Các chữ: A, B, C, E, Ê',
  learningGoals: ([
    ['RECOGNIZE_A', 'Nhận biết chữ a'], ['RECOGNIZE_A_CASE', 'Phân biệt A hoa và a thường'], ['LISTEN_A', 'Nghe và chọn chữ a'], ['FIND_A_IN_TEXT', 'Chọn từ có chữ a'], ['MATCH_A', 'Chọn chữ a'],
    ['RECOGNIZE_B', 'Nhận biết chữ b'], ['RECOGNIZE_B_CASE', 'Phân biệt B hoa và b thường'], ['LISTEN_B', 'Nghe và chọn chữ b'], ['FIND_B_IN_TEXT', 'Chọn từ có chữ b'], ['MATCH_B', 'Chọn chữ b'], ['BUILD_BA', 'Ghép tiếng ba'], ['RECOGNIZE_HUYEN', 'Nhận biết dấu huyền'], ['READ_B_WORDS', 'Đọc tiếng và từ với b'],
    ['RECOGNIZE_C', 'Nhận biết chữ c'], ['RECOGNIZE_C_CASE', 'Phân biệt C hoa và c thường'], ['LISTEN_C', 'Nghe và chọn chữ c'], ['FIND_C_IN_TEXT', 'Chọn từ có chữ c'], ['MATCH_C', 'Chọn chữ c'], ['BUILD_CA', 'Ghép tiếng ca'], ['RECOGNIZE_SAC', 'Nhận biết dấu sắc'], ['RECOGNIZE_TONES_CA', 'Phân biệt ca, cà, cá'], ['READ_C_WORDS', 'Đọc tiếng và từ với c'],
    ['RECOGNIZE_E', 'Nhận biết chữ e'], ['RECOGNIZE_E_CASE', 'Phân biệt E hoa và e thường'], ['RECOGNIZE_E_CIRCUMFLEX', 'Phân biệt e và ê'], ['LISTEN_E_ECIRC', 'Nghe và chọn ê'], ['FIND_E_IN_TEXT', 'Chọn từ có chữ e hoặc ê'], ['MATCH_E', 'Chọn chữ e hoặc ê'], ['BUILD_B_E', 'Ghép tiếng bè, bé, bế'], ['RECOGNIZE_E_WORDS', 'Nhận biết tiếng với e, ê'], ['READ_E_WORDS', 'Đọc tiếng và từ với e, ê'],
    ['REVIEW_LETTERS_WEEK_1', 'Ôn chữ a, b, c, e, ê'], ['REVIEW_CASE_WEEK_1', 'Ôn chữ hoa và chữ thường'], ['REVIEW_BUILD_SYLLABLES_WEEK_1', 'Ôn ghép tiếng'], ['REVIEW_TONES_WEEK_1', 'Ôn dấu huyền và dấu sắc'], ['REVIEW_READ_WORDS_WEEK_1', 'Ôn đọc từ'], ['REVIEW_SENTENCE_WEEK_1', 'Ôn đọc câu ngắn'],
  ] as const).map(([key, title]) => ({ key, title })),
  week: 1,
  sourceLessons: [1, 2, 3, 4, 5],
  storyMetadata: { title: 'Búp bê và dế mèn', sourceLesson: 5, includedInGameQuestions: false },
} as const

export type VietnameseWeek1Goal = keyof typeof TIENG_VIET_1_WEEK_1_LEARNING_KEYS
