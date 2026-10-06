export const TIENG_VIET_1_WEEK_4_LEARNING_KEYS = {
  RECOGNIZE_M: 'RECOGNIZE_M', RECOGNIZE_M_CASE: 'RECOGNIZE_M_CASE',
  RECOGNIZE_N: 'RECOGNIZE_N', RECOGNIZE_N_CASE: 'RECOGNIZE_N_CASE',
  DISTINGUISH_M_N: 'DISTINGUISH_M_N', LISTEN_M_N: 'LISTEN_M_N',
  FIND_M_N_IN_TEXT: 'FIND_M_N_IN_TEXT', MATCH_M_N: 'MATCH_M_N',
  BUILD_M_SYLLABLES: 'BUILD_M_SYLLABLES', BUILD_N_SYLLABLES: 'BUILD_N_SYLLABLES',
  READ_M_N_SYLLABLES: 'READ_M_N_SYLLABLES', READ_M_N_WORDS: 'READ_M_N_WORDS', READ_M_N_SENTENCE: 'READ_M_N_SENTENCE',

  RECOGNIZE_G: 'RECOGNIZE_G', RECOGNIZE_G_CASE: 'RECOGNIZE_G_CASE',
  RECOGNIZE_GI: 'RECOGNIZE_GI', RECOGNIZE_GI_CASE: 'RECOGNIZE_GI_CASE',
  DISTINGUISH_G_GI: 'DISTINGUISH_G_GI', LISTEN_G_GI: 'LISTEN_G_GI',
  FIND_G_GI_IN_TEXT: 'FIND_G_GI_IN_TEXT', MATCH_G_GI: 'MATCH_G_GI',
  BUILD_G_SYLLABLES: 'BUILD_G_SYLLABLES', BUILD_GI_SYLLABLES: 'BUILD_GI_SYLLABLES',
  READ_G_GI_SYLLABLES: 'READ_G_GI_SYLLABLES', READ_G_GI_WORDS: 'READ_G_GI_WORDS', READ_G_GI_SENTENCE: 'READ_G_GI_SENTENCE',

  RECOGNIZE_GH: 'RECOGNIZE_GH', RECOGNIZE_GH_CASE: 'RECOGNIZE_GH_CASE',
  RECOGNIZE_NH: 'RECOGNIZE_NH', RECOGNIZE_NH_CASE: 'RECOGNIZE_NH_CASE',
  DISTINGUISH_GH_NH: 'DISTINGUISH_GH_NH', LISTEN_GH_NH: 'LISTEN_GH_NH',
  FIND_GH_NH_IN_TEXT: 'FIND_GH_NH_IN_TEXT', MATCH_GH_NH: 'MATCH_GH_NH',
  BUILD_GH_SYLLABLES: 'BUILD_GH_SYLLABLES', BUILD_NH_SYLLABLES: 'BUILD_NH_SYLLABLES',
  READ_GH_NH_SYLLABLES: 'READ_GH_NH_SYLLABLES', READ_GH_NH_WORDS: 'READ_GH_NH_WORDS', READ_GH_NH_SENTENCE: 'READ_GH_NH_SENTENCE',

  RECOGNIZE_NG: 'RECOGNIZE_NG', RECOGNIZE_NG_CASE: 'RECOGNIZE_NG_CASE',
  RECOGNIZE_NGH: 'RECOGNIZE_NGH', RECOGNIZE_NGH_CASE: 'RECOGNIZE_NGH_CASE',
  DISTINGUISH_NG_NGH: 'DISTINGUISH_NG_NGH', LISTEN_NG_NGH: 'LISTEN_NG_NGH',
  FIND_NG_NGH_IN_TEXT: 'FIND_NG_NGH_IN_TEXT', MATCH_NG_NGH: 'MATCH_NG_NGH',
  BUILD_NG_SYLLABLES: 'BUILD_NG_SYLLABLES', BUILD_NGH_SYLLABLES: 'BUILD_NGH_SYLLABLES',
  READ_NG_NGH_SYLLABLES: 'READ_NG_NGH_SYLLABLES', READ_NG_NGH_WORDS: 'READ_NG_NGH_WORDS', READ_NG_NGH_SENTENCE: 'READ_NG_NGH_SENTENCE',

  REVIEW_LETTERS_WEEK_4: 'REVIEW_LETTERS_WEEK_4', REVIEW_CASE_WEEK_4: 'REVIEW_CASE_WEEK_4',
  REVIEW_M_N_WEEK_4: 'REVIEW_M_N_WEEK_4', REVIEW_G_GI_WEEK_4: 'REVIEW_G_GI_WEEK_4',
  REVIEW_GH_NH_WEEK_4: 'REVIEW_GH_NH_WEEK_4', REVIEW_NG_NGH_WEEK_4: 'REVIEW_NG_NGH_WEEK_4',
  REVIEW_BUILD_SYLLABLES_WEEK_4: 'REVIEW_BUILD_SYLLABLES_WEEK_4',
  REVIEW_READ_SYLLABLES_WEEK_4: 'REVIEW_READ_SYLLABLES_WEEK_4',
  REVIEW_READ_WORDS_WEEK_4: 'REVIEW_READ_WORDS_WEEK_4', REVIEW_SENTENCE_WEEK_4: 'REVIEW_SENTENCE_WEEK_4',
} as const

export type VietnameseWeek4Goal = keyof typeof TIENG_VIET_1_WEEK_4_LEARNING_KEYS

const learningGoalTitles: Record<VietnameseWeek4Goal, string> = {
  RECOGNIZE_M: 'Nhận biết chữ m', RECOGNIZE_M_CASE: 'Phân biệt M hoa và m thường',
  RECOGNIZE_N: 'Nhận biết chữ n', RECOGNIZE_N_CASE: 'Phân biệt N hoa và n thường',
  DISTINGUISH_M_N: 'Phân biệt chữ m và n', LISTEN_M_N: 'Nghe và chọn chữ m hoặc n',
  FIND_M_N_IN_TEXT: 'Chọn tiếng, từ bắt đầu bằng m hoặc n', MATCH_M_N: 'Chọn chữ hoa hoặc chữ thường m, n',
  BUILD_M_SYLLABLES: 'Ghép tiếng bắt đầu bằng m', BUILD_N_SYLLABLES: 'Ghép tiếng bắt đầu bằng n',
  READ_M_N_SYLLABLES: 'Đọc tiếng có m hoặc n', READ_M_N_WORDS: 'Đọc từ có m hoặc n', READ_M_N_SENTENCE: 'Đọc câu có m hoặc n',

  RECOGNIZE_G: 'Nhận biết chữ g', RECOGNIZE_G_CASE: 'Phân biệt G hoa và g thường',
  RECOGNIZE_GI: 'Nhận biết phụ âm đầu gi', RECOGNIZE_GI_CASE: 'Phân biệt GI hoa và gi thường',
  DISTINGUISH_G_GI: 'Phân biệt phụ âm đầu g và gi', LISTEN_G_GI: 'Nghe và chọn phụ âm đầu g hoặc gi',
  FIND_G_GI_IN_TEXT: 'Chọn tiếng, từ bắt đầu bằng g hoặc gi', MATCH_G_GI: 'Chọn chữ hoa hoặc chữ thường g, gi',
  BUILD_G_SYLLABLES: 'Ghép tiếng bắt đầu bằng g', BUILD_GI_SYLLABLES: 'Ghép tiếng bắt đầu bằng gi',
  READ_G_GI_SYLLABLES: 'Đọc tiếng có g hoặc gi', READ_G_GI_WORDS: 'Đọc từ có g hoặc gi', READ_G_GI_SENTENCE: 'Đọc câu có g hoặc gi',

  RECOGNIZE_GH: 'Nhận biết phụ âm đầu gh', RECOGNIZE_GH_CASE: 'Phân biệt GH hoa và gh thường',
  RECOGNIZE_NH: 'Nhận biết phụ âm đầu nh', RECOGNIZE_NH_CASE: 'Phân biệt NH hoa và nh thường',
  DISTINGUISH_GH_NH: 'Phân biệt phụ âm đầu gh và nh', LISTEN_GH_NH: 'Nghe và chọn phụ âm đầu gh hoặc nh',
  FIND_GH_NH_IN_TEXT: 'Chọn tiếng, từ bắt đầu bằng gh hoặc nh', MATCH_GH_NH: 'Chọn chữ hoa hoặc chữ thường gh, nh',
  BUILD_GH_SYLLABLES: 'Ghép tiếng bắt đầu bằng gh', BUILD_NH_SYLLABLES: 'Ghép tiếng bắt đầu bằng nh',
  READ_GH_NH_SYLLABLES: 'Đọc tiếng có gh hoặc nh', READ_GH_NH_WORDS: 'Đọc từ có gh hoặc nh', READ_GH_NH_SENTENCE: 'Đọc câu có gh hoặc nh',

  RECOGNIZE_NG: 'Nhận biết phụ âm đầu ng', RECOGNIZE_NG_CASE: 'Phân biệt NG hoa và ng thường',
  RECOGNIZE_NGH: 'Nhận biết phụ âm đầu ngh', RECOGNIZE_NGH_CASE: 'Phân biệt NGH hoa và ngh thường',
  DISTINGUISH_NG_NGH: 'Phân biệt cách viết ng và ngh', LISTEN_NG_NGH: 'Nghe và chọn phụ âm đầu ng hoặc ngh',
  FIND_NG_NGH_IN_TEXT: 'Chọn tiếng, từ bắt đầu bằng ng hoặc ngh', MATCH_NG_NGH: 'Chọn chữ hoa hoặc chữ thường ng, ngh',
  BUILD_NG_SYLLABLES: 'Ghép tiếng bắt đầu bằng ng', BUILD_NGH_SYLLABLES: 'Ghép tiếng bắt đầu bằng ngh',
  READ_NG_NGH_SYLLABLES: 'Đọc tiếng có ng hoặc ngh', READ_NG_NGH_WORDS: 'Đọc từ có ng hoặc ngh', READ_NG_NGH_SENTENCE: 'Đọc câu có ng hoặc ngh',

  REVIEW_LETTERS_WEEK_4: 'Ôn nhận biết m, n, g, gi, gh, nh, ng, ngh',
  REVIEW_CASE_WEEK_4: 'Ôn chữ hoa và chữ thường tuần 4',
  REVIEW_M_N_WEEK_4: 'Ôn m và n', REVIEW_G_GI_WEEK_4: 'Ôn g và gi',
  REVIEW_GH_NH_WEEK_4: 'Ôn gh và nh', REVIEW_NG_NGH_WEEK_4: 'Ôn ng và ngh',
  REVIEW_BUILD_SYLLABLES_WEEK_4: 'Ôn ghép tiếng tuần 4', REVIEW_READ_SYLLABLES_WEEK_4: 'Ôn đọc tiếng tuần 4',
  REVIEW_READ_WORDS_WEEK_4: 'Ôn đọc từ, cụm từ tuần 4', REVIEW_SENTENCE_WEEK_4: 'Ôn đọc câu ngắn tuần 4',
}

export const TIENG_VIET_1_WEEK_4 = {
  lessonId: 'tieng-viet-1-tuan-4', gradeId: 'lop-1', gradeLabel: 'Lớp 1',
  subjectId: 'tieng-viet', subjectLabel: 'Tiếng Việt', lessonNumber: 4,
  title: 'Các chữ: M, N, G, GI, GH, NH, NG, NGH',
  learningGoals: (Object.entries(learningGoalTitles) as [VietnameseWeek4Goal, string][]).map(([key, title]) => ({ key, title })),
  week: 4,
  sourceLessons: [16, 17, 18, 19, 20],
  storyMetadata: {
    title: 'Cô chủ không biết quý tình bạn', sourceLesson: 20, imageCount: 4,
    images: [] as const, questions: [] as const, lessonId: 'tieng-viet-1-tuan-4', includedInGameQuestions: false,
  },
} as const
