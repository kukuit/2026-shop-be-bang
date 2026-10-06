export const TIENG_VIET_1_WEEK_3_LEARNING_KEYS = {
  RECOGNIZE_I: 'RECOGNIZE_I', RECOGNIZE_I_CASE: 'RECOGNIZE_I_CASE',
  RECOGNIZE_K: 'RECOGNIZE_K', RECOGNIZE_K_CASE: 'RECOGNIZE_K_CASE',
  DISTINGUISH_I_K: 'DISTINGUISH_I_K', LISTEN_I_K: 'LISTEN_I_K',
  FIND_I_K_IN_TEXT: 'FIND_I_K_IN_TEXT', MATCH_I_K: 'MATCH_I_K', BUILD_KI_SYLLABLES: 'BUILD_KI_SYLLABLES',
  READ_I_K_SYLLABLES: 'READ_I_K_SYLLABLES', READ_I_K_WORDS: 'READ_I_K_WORDS', READ_I_K_SENTENCE: 'READ_I_K_SENTENCE',

  RECOGNIZE_H: 'RECOGNIZE_H', RECOGNIZE_H_CASE: 'RECOGNIZE_H_CASE',
  RECOGNIZE_L: 'RECOGNIZE_L', RECOGNIZE_L_CASE: 'RECOGNIZE_L_CASE',
  DISTINGUISH_H_L: 'DISTINGUISH_H_L', LISTEN_H_L: 'LISTEN_H_L',
  FIND_H_L_IN_TEXT: 'FIND_H_L_IN_TEXT', MATCH_H_L: 'MATCH_H_L', BUILD_H_L_SYLLABLES: 'BUILD_H_L_SYLLABLES',
  READ_H_L_SYLLABLES: 'READ_H_L_SYLLABLES', READ_H_L_WORDS: 'READ_H_L_WORDS', READ_H_L_SENTENCE: 'READ_H_L_SENTENCE',

  RECOGNIZE_U: 'RECOGNIZE_U', RECOGNIZE_U_CASE: 'RECOGNIZE_U_CASE',
  RECOGNIZE_U_HORN: 'RECOGNIZE_U_HORN', RECOGNIZE_U_HORN_CASE: 'RECOGNIZE_U_HORN_CASE',
  DISTINGUISH_U_UHORN: 'DISTINGUISH_U_UHORN', LISTEN_U_UHORN: 'LISTEN_U_UHORN',
  FIND_U_UHORN_IN_TEXT: 'FIND_U_UHORN_IN_TEXT', MATCH_U_UHORN: 'MATCH_U_UHORN',
  BUILD_U_SYLLABLES: 'BUILD_U_SYLLABLES', BUILD_UHORN_SYLLABLES: 'BUILD_UHORN_SYLLABLES',
  READ_U_UHORN_SYLLABLES: 'READ_U_UHORN_SYLLABLES', READ_U_UHORN_WORDS: 'READ_U_UHORN_WORDS', READ_U_UHORN_SENTENCE: 'READ_U_UHORN_SENTENCE',

  RECOGNIZE_CH: 'RECOGNIZE_CH', RECOGNIZE_CH_CASE: 'RECOGNIZE_CH_CASE',
  RECOGNIZE_KH: 'RECOGNIZE_KH', RECOGNIZE_KH_CASE: 'RECOGNIZE_KH_CASE',
  DISTINGUISH_CH_KH: 'DISTINGUISH_CH_KH', LISTEN_CH_KH: 'LISTEN_CH_KH',
  FIND_CH_KH_IN_TEXT: 'FIND_CH_KH_IN_TEXT', MATCH_CH_KH: 'MATCH_CH_KH',
  BUILD_CH_SYLLABLES: 'BUILD_CH_SYLLABLES', BUILD_KH_SYLLABLES: 'BUILD_KH_SYLLABLES',
  READ_CH_KH_SYLLABLES: 'READ_CH_KH_SYLLABLES', READ_CH_KH_WORDS: 'READ_CH_KH_WORDS', READ_CH_KH_SENTENCE: 'READ_CH_KH_SENTENCE',

  REVIEW_LETTERS_WEEK_3: 'REVIEW_LETTERS_WEEK_3', REVIEW_CASE_WEEK_3: 'REVIEW_CASE_WEEK_3',
  REVIEW_I_K_WEEK_3: 'REVIEW_I_K_WEEK_3', REVIEW_H_L_WEEK_3: 'REVIEW_H_L_WEEK_3',
  REVIEW_U_UHORN_WEEK_3: 'REVIEW_U_UHORN_WEEK_3', REVIEW_CH_KH_WEEK_3: 'REVIEW_CH_KH_WEEK_3',
  REVIEW_BUILD_SYLLABLES_WEEK_3: 'REVIEW_BUILD_SYLLABLES_WEEK_3',
  REVIEW_READ_SYLLABLES_WEEK_3: 'REVIEW_READ_SYLLABLES_WEEK_3',
  REVIEW_READ_WORDS_WEEK_3: 'REVIEW_READ_WORDS_WEEK_3', REVIEW_SENTENCE_WEEK_3: 'REVIEW_SENTENCE_WEEK_3',
} as const

export type VietnameseWeek3Goal = keyof typeof TIENG_VIET_1_WEEK_3_LEARNING_KEYS

const learningGoalTitles: Record<VietnameseWeek3Goal, string> = {
  RECOGNIZE_I: 'Nhận biết chữ i', RECOGNIZE_I_CASE: 'Phân biệt I hoa và i thường',
  RECOGNIZE_K: 'Nhận biết chữ k', RECOGNIZE_K_CASE: 'Phân biệt K hoa và k thường',
  DISTINGUISH_I_K: 'Phân biệt chữ i và k', LISTEN_I_K: 'Nghe và chọn chữ i hoặc k',
  FIND_I_K_IN_TEXT: 'Chọn tiếng, từ có chữ i hoặc k', MATCH_I_K: 'Chọn chữ hoa hoặc chữ thường i, k',
  BUILD_KI_SYLLABLES: 'Ghép tiếng bắt đầu bằng k', READ_I_K_SYLLABLES: 'Đọc tiếng có i hoặc k',
  READ_I_K_WORDS: 'Đọc từ có i hoặc k', READ_I_K_SENTENCE: 'Đọc câu có i hoặc k',

  RECOGNIZE_H: 'Nhận biết chữ h', RECOGNIZE_H_CASE: 'Phân biệt H hoa và h thường',
  RECOGNIZE_L: 'Nhận biết chữ l', RECOGNIZE_L_CASE: 'Phân biệt L hoa và l thường',
  DISTINGUISH_H_L: 'Phân biệt chữ h và l', LISTEN_H_L: 'Nghe và chọn chữ h hoặc l',
  FIND_H_L_IN_TEXT: 'Chọn tiếng, từ có chữ h hoặc l', MATCH_H_L: 'Chọn chữ hoa hoặc chữ thường h, l',
  BUILD_H_L_SYLLABLES: 'Ghép tiếng bắt đầu bằng h hoặc l', READ_H_L_SYLLABLES: 'Đọc tiếng có h hoặc l',
  READ_H_L_WORDS: 'Đọc từ có h hoặc l', READ_H_L_SENTENCE: 'Đọc câu có h hoặc l',

  RECOGNIZE_U: 'Nhận biết chữ u', RECOGNIZE_U_CASE: 'Phân biệt U hoa và u thường',
  RECOGNIZE_U_HORN: 'Nhận biết chữ ư', RECOGNIZE_U_HORN_CASE: 'Phân biệt Ư hoa và ư thường',
  DISTINGUISH_U_UHORN: 'Phân biệt chữ u và ư', LISTEN_U_UHORN: 'Nghe và chọn tiếng có u hoặc ư',
  FIND_U_UHORN_IN_TEXT: 'Chọn tiếng, từ có chữ u hoặc ư', MATCH_U_UHORN: 'Chọn chữ hoa hoặc chữ thường u, ư',
  BUILD_U_SYLLABLES: 'Ghép tiếng có chữ u', BUILD_UHORN_SYLLABLES: 'Ghép tiếng có chữ ư',
  READ_U_UHORN_SYLLABLES: 'Đọc tiếng có u hoặc ư', READ_U_UHORN_WORDS: 'Đọc từ có u hoặc ư', READ_U_UHORN_SENTENCE: 'Đọc câu có u hoặc ư',

  RECOGNIZE_CH: 'Nhận biết phụ âm đầu ch', RECOGNIZE_CH_CASE: 'Phân biệt CH hoa và ch thường',
  RECOGNIZE_KH: 'Nhận biết phụ âm đầu kh', RECOGNIZE_KH_CASE: 'Phân biệt KH hoa và kh thường',
  DISTINGUISH_CH_KH: 'Phân biệt phụ âm đầu ch và kh', LISTEN_CH_KH: 'Nghe và chọn ch hoặc kh',
  FIND_CH_KH_IN_TEXT: 'Chọn tiếng bắt đầu bằng ch hoặc kh', MATCH_CH_KH: 'Chọn chữ hoa hoặc chữ thường ch, kh',
  BUILD_CH_SYLLABLES: 'Ghép tiếng bắt đầu bằng ch', BUILD_KH_SYLLABLES: 'Ghép tiếng bắt đầu bằng kh',
  READ_CH_KH_SYLLABLES: 'Đọc tiếng bắt đầu bằng ch hoặc kh', READ_CH_KH_WORDS: 'Đọc từ có ch hoặc kh', READ_CH_KH_SENTENCE: 'Đọc câu có ch hoặc kh',

  REVIEW_LETTERS_WEEK_3: 'Ôn nhận biết i, k, h, l, u, ư, ch, kh', REVIEW_CASE_WEEK_3: 'Ôn chữ hoa và chữ thường tuần 3',
  REVIEW_I_K_WEEK_3: 'Ôn i và k', REVIEW_H_L_WEEK_3: 'Ôn h và l',
  REVIEW_U_UHORN_WEEK_3: 'Ôn u và ư', REVIEW_CH_KH_WEEK_3: 'Ôn ch và kh',
  REVIEW_BUILD_SYLLABLES_WEEK_3: 'Ôn ghép tiếng tuần 3', REVIEW_READ_SYLLABLES_WEEK_3: 'Ôn đọc tiếng tuần 3',
  REVIEW_READ_WORDS_WEEK_3: 'Ôn đọc từ, cụm từ tuần 3', REVIEW_SENTENCE_WEEK_3: 'Ôn đọc câu ngắn tuần 3',
}

export const TIENG_VIET_1_WEEK_3 = {
  lessonId: 'tieng-viet-1-tuan-3', gradeId: 'lop-1', gradeLabel: 'Lớp 1',
  subjectId: 'tieng-viet', subjectLabel: 'Tiếng Việt', lessonNumber: 3,
  title: 'Các chữ: I, K, H, L, U, Ư, CH, KH',
  learningGoals: (Object.entries(learningGoalTitles) as [VietnameseWeek3Goal, string][]).map(([key, title]) => ({ key, title })),
  week: 3,
  sourceLessons: [11, 12, 13, 14, 15],
  storyMetadata: { title: 'Con quạ thông minh', sourceLesson: 15, includedInGameQuestions: false },
} as const
