'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import HiddenLetterScene from './HiddenLetterScene'
import ExamAudioButton from '../ExamAudioButton'
import { sanitizeSingleVietnameseLetter } from '../../_exam/answer-utils'
import type { HiddenLetterSceneData } from '../../_exam/types'
import styles from '../exam.module.css'

export default function HiddenLetterInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const scene = question.data?.scene as HiddenLetterSceneData | undefined
  const allowedLetters = Array.isArray(question.data?.allowedLetters)
    ? question.data.allowedLetters.filter((letter): letter is string => typeof letter === 'string')
    : []
  const introText = typeof question.data?.introText === 'string' ? question.data.introText : ''
  const questionText = typeof question.data?.questionText === 'string' ? question.data.questionText : ''
  const voiceSequence = Array.isArray(question.data?.questionVoice)
    ? question.data.questionVoice.filter((voice): voice is string => typeof voice === 'string')
    : []
  const displayedAnswer = typeof answer === 'string' ? answer : ''
  const [sentencePrefix = questionText, sentenceSuffix = ''] = questionText.split('[____]')
  const sceneAudioId = `${question.id}:hidden-letter-question`

  return <QuestionFrame {...props}>
    {scene && <div className={styles.hiddenLetterSceneStage}><HiddenLetterScene scene={scene} /></div>}
    <div className={styles.hiddenLetterAnswerBlock}>
      <p className={`${styles.questionPrompt} ${styles.hiddenLetterAnswerSentence}`}>
        <span>{introText} {sentencePrefix}</span>
        <input
          id={`${question.id}-hidden-letter-answer`}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={3}
          disabled={disabled}
          value={displayedAnswer}
          onChange={event => onAnswer(question.id, sanitizeSingleVietnameseLetter(event.target.value, allowedLetters))}
          className={styles.numberCardAnswerInput}
          aria-label={`Nhập chữ cái ẩn nấp ở câu ${question.number}`}
        />
        <span>{sentenceSuffix}</span>
      </p>
      <div className={styles.answerVoiceRow}>
        <ExamAudioButton
          active={playingId === sceneAudioId}
          label={`Nghe câu hỏi trốn tìm câu ${question.number}`}
          disabled={disabled || voiceSequence.length === 0}
          onClick={() => { if (voiceSequence.length > 0) onPlayAudio(sceneAudioId, voiceSequence) }}
        />
      </div>
    </div>
  </QuestionFrame>
}
