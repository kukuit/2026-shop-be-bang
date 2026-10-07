export const MOCK_EXAM_ID = 'tv1-trang-nguyen-mock'
export const LEGACY_MOCK_EXAM_VERSION = 'tv1-trang-nguyen-v20'
export const MOCK_EXAM_VERSION = 'tv1-trang-nguyen-v21'
export const SUPPORTED_MOCK_EXAM_VERSIONS = [LEGACY_MOCK_EXAM_VERSION, MOCK_EXAM_VERSION] as const
export const MOCK_EXAM_TITLE = 'Thi thử Trạng Nguyên Tiếng Việt lớp 1'
export const MOCK_EXAM_DURATION_SECONDS = 30 * 60
export const MOCK_EXAM_QUESTION_COUNT = 30

export function isSupportedMockExamVersion(version: string): version is typeof SUPPORTED_MOCK_EXAM_VERSIONS[number] {
  return SUPPORTED_MOCK_EXAM_VERSIONS.includes(version as typeof SUPPORTED_MOCK_EXAM_VERSIONS[number])
}
