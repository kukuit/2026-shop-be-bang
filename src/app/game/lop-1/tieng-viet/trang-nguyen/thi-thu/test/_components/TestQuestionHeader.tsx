import Link from 'next/link'
import ExamHeader from '../../_components/ExamHeader'
import styles from './TestQuestionHeader.module.css'

const TEST_QUESTION_NUMBERS = [
  ...Array.from({ length: 30 }, (_, index) => index + 1),
]

type TestQuestionHeaderProps = {
  questionNumber: number
}

export default function TestQuestionHeader({ questionNumber }: TestQuestionHeaderProps) {
  const currentIndex = TEST_QUESTION_NUMBERS.indexOf(questionNumber)
  const previousQuestion = currentIndex > 0 ? TEST_QUESTION_NUMBERS[currentIndex - 1] : undefined
  const nextQuestion = currentIndex < TEST_QUESTION_NUMBERS.length - 1
    ? TEST_QUESTION_NUMBERS[currentIndex + 1]
    : undefined

  return (
    <>
      <ExamHeader />
      <nav className={styles.pagination} aria-label="Chọn câu test">
        <div className={styles.paginationInner}>
          <span className={styles.label}>
            Câu {questionNumber} / {TEST_QUESTION_NUMBERS.length}
          </span>
          <div className={styles.questionList}>
            {TEST_QUESTION_NUMBERS.map((number) => {
              const isCurrent = number === questionNumber
              return (
                <Link
                  key={number}
                  href={`/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-${number}`}
                  className={isCurrent ? `${styles.questionLink} ${styles.current}` : styles.questionLink}
                  aria-label={`Câu ${number}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  prefetch={false}
                >
                  {number}
                </Link>
              )
            })}
          </div>
          <div className={styles.stepNavigation}>
            {previousQuestion ? (
              <Link
                className={styles.stepLink}
                href={`/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-${previousQuestion}`}
                prefetch={false}
              >
                ← Câu trước
              </Link>
            ) : (
              <span className={`${styles.stepLink} ${styles.disabled}`} aria-disabled="true">
                ← Câu trước
              </span>
            )}
            {nextQuestion ? (
              <Link
                className={styles.stepLink}
                href={`/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-${nextQuestion}`}
                prefetch={false}
              >
                Câu tiếp theo →
              </Link>
            ) : (
              <span className={`${styles.stepLink} ${styles.disabled}`} aria-disabled="true">
                Câu tiếp theo →
              </span>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
