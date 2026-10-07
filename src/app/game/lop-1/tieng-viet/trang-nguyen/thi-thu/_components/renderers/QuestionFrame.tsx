'use client'

import type { ReactNode } from 'react'
import type { ExamQuestion } from '../../_exam/types'
import ExamAudioButton from '../ExamAudioButton'
import styles from '../exam.module.css'

export type QuestionRendererProps = {
  question: ExamQuestion
  answer?: import('../../_exam/types').ExamAnswer
  disabled: boolean
  playingId: string | null
  audioVolume?: number
  onAudioVolumeChange?(volume: number): void
  onAnswer(questionId: string, answer: import('../../_exam/types').ExamAnswer): void
  onPlayAudio(id: string, src: string | readonly string[]): void
}

export default function QuestionFrame({ question, children, playingId, onPlayAudio }: QuestionRendererProps & { children: ReactNode }) {
  const promptAudioId = `${question.id}:prompt`
  const findTargetObjects = question.templateId === 'T01'
  const findObjectByName = question.data?.generator === 'FIND_OBJECT_BY_NAME'
  const letterBoardQuestion = question.data?.generator === 'RECOGNIZE_LETTERS_IN_IMAGE'
  const numberCardQuestion = question.data?.generator === 'RECOGNIZE_NUMBER_ON_CARD'
  const classificationQuestion = question.data?.generator === 'CLASSIFY_NUMBER_AND_LETTER'
    || question.data?.generator === 'CLASSIFY_CATEGORY_PAIRS'
  const alphabetOrderQuestion = question.data?.generator === 'ORDER_VIETNAMESE_ALPHABET'
  const promptVoice = question.promptVoice
  return <section id={`question-${question.number}`} data-question-id={question.id} data-question-number={question.number} className={`exam-question ${styles.examQuestion} ${findTargetObjects ? styles.examQuestionFindTarget : ''}`} aria-labelledby={`${question.id}-title`}>
    <div className={styles.questionHeading}>
      <div className="min-w-0">
        <h2 id={`${question.id}-title`} className={styles.questionTitle}>Câu hỏi {question.number}</h2>
        <p className={styles.questionPrompt}>{question.prompt}</p>
      </div>
      {(promptVoice || findTargetObjects || findObjectByName || letterBoardQuestion || numberCardQuestion || classificationQuestion || alphabetOrderQuestion) && <ExamAudioButton
        active={playingId === promptAudioId}
        label={`Nghe nội dung câu ${question.number}`}
        disabled={!promptVoice}
        onClick={() => { if (promptVoice) onPlayAudio(promptAudioId, promptVoice) }}
      />}
    </div>
    {children}
  </section>
}
