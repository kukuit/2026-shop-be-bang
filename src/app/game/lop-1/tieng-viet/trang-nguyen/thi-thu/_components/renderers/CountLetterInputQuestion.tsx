'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import CountLetterBoard from './CountLetterBoard'
import ExamAudioButton from '../ExamAudioButton'
import type { CountLetterBoardItem } from '../../_exam/types'
import styles from '../exam.module.css'

export default function CountLetterInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const targetLetter = typeof question.data?.targetLetter === 'string' ? question.data.targetLetter : ''
  const items = Array.isArray(question.data?.boardItems) ? question.data.boardItems as CountLetterBoardItem[] : []
  const prefixText = typeof question.data?.prefixText === 'string' ? question.data.prefixText : 'Trong hình trên có tất cả'
  const prefixVoice = typeof question.data?.prefixVoice === 'string' ? question.data.prefixVoice : ''
  const targetLetterVoice = typeof question.data?.targetLetterVoice === 'string' ? question.data.targetLetterVoice : ''
  const displayedAnswer = typeof answer === 'string' ? answer : ''
  const countPromptId = `${question.id}:count-prompt`

  return <QuestionFrame {...props}>
    <div className={styles.countLetterBoardStage}>
      <CountLetterBoard items={items} />
    </div>
    <div className={styles.countLetterAnswerRow}>
      <span className={styles.countLetterAnswerPrefix}>{prefixText}</span>
      <input
        id={`${question.id}-count-answer`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={2}
        disabled={disabled}
        value={displayedAnswer}
        onChange={event => onAnswer(question.id, event.target.value.replace(/\D/g, '').slice(0, 2))}
        className={styles.numberCardAnswerInput}
        aria-label={`Nhập số chữ ${targetLetter} trong hình ở câu ${question.number}`}
      />
      <span>chữ &quot;{targetLetter}&quot;.</span>
    </div>
    <div className={styles.answerVoiceRow}>
      <ExamAudioButton
        active={playingId === countPromptId}
        label={`Nghe câu hỏi đếm chữ ${targetLetter}`}
        disabled={disabled || !prefixVoice || !targetLetterVoice}
        onClick={() => {
          if (prefixVoice && targetLetterVoice) onPlayAudio(countPromptId, [prefixVoice, targetLetterVoice])
        }}
      />
    </div>
  </QuestionFrame>
}
