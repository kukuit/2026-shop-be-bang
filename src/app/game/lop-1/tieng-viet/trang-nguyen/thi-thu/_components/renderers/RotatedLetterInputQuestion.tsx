'use client'

import type { CSSProperties } from 'react'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import ExamAudioButton from '../ExamAudioButton'
import { sanitizeSingleVietnameseLetter } from '../../_exam/answer-utils'
import type { RotatedLetterBoardItem, RotatedLetterBoardStyle } from '../../_exam/types'
import styles from '../exam.module.css'

const boardStyleClass: Record<RotatedLetterBoardStyle, string> = {
  scallop: styles.rotatedLetterBoardScallop,
  'rounded-square': styles.rotatedLetterBoardRounded,
  'double-border': styles.rotatedLetterBoardDouble,
}

function RotatedLetterBoard({ items, style }: { items: RotatedLetterBoardItem[]; style: RotatedLetterBoardStyle }) {
  return <div className={`${styles.rotatedLetterBoard} ${boardStyleClass[style]}`} role="group" aria-label="Bảng chữ cái có một chữ bị xoay ngược">
    {items.map(item => <span
      key={item.id}
      className={styles.rotatedLetterBoardItem}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        color: item.color,
        fontSize: `${item.size}px`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
      } satisfies CSSProperties}
    >{item.letter}</span>)}
  </div>
}

export default function RotatedLetterInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const board = question.data?.board as { items?: RotatedLetterBoardItem[]; style?: RotatedLetterBoardStyle } | undefined
  const allowedLetters = Array.isArray(question.data?.allowedLetters)
    ? question.data.allowedLetters.filter((letter): letter is string => typeof letter === 'string')
    : []
  const questionVoice = typeof question.data?.questionVoice === 'string' ? question.data.questionVoice : undefined
  const questionAudioId = `${question.id}:rotated-letter-question`

  return <QuestionFrame {...props}>
    {board && board.items && board.style && <div className={styles.rotatedLetterBoardStage}>
      <RotatedLetterBoard items={board.items} style={board.style} />
    </div>}
    <div className={styles.rotatedLetterQuestionBlock}>
      <div className={styles.rotatedLetterAnswerLine}>
        <span>Chữ</span>
        <input
          id={`${question.id}-rotated-letter-answer`}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={3}
          disabled={disabled}
          value={typeof answer === 'string' ? answer : ''}
          onChange={event => onAnswer(question.id, sanitizeSingleVietnameseLetter(event.target.value, allowedLetters))}
          className={styles.numberCardAnswerInput}
          aria-label={`Nhập chữ cái bị xoay ngược ở câu ${question.number}`}
        />
        <span>trong hình trên bị xoay ngược.</span>
      </div>
      <div className={styles.answerVoiceRow}>
      <ExamAudioButton
        active={playingId === questionAudioId}
        label={`Nghe câu hỏi xoay chữ câu ${question.number}`}
        disabled={disabled || !questionVoice}
        onClick={() => { if (questionVoice) onPlayAudio(questionAudioId, questionVoice) }}
      />
      </div>
    </div>
  </QuestionFrame>
}
