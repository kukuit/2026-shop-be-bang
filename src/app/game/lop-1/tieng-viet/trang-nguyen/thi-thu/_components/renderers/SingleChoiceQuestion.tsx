'use client'

import ExamAudioButton from '../ExamAudioButton'
import type { ExamOption } from '../../_exam/types'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import styles from '../exam.module.css'

export default function SingleChoiceQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const content = question.content
  return <QuestionFrame {...props}>
    {content?.type === 'text' && <div className={styles.questionContent}>{content.text}</div>}
    {content?.type === 'visual' && content.visual && <div className={styles.questionVisuals}><QuestionVisual visual={content.visual} /></div>}
    {content?.type === 'visuals' && content.visuals && <div className={styles.questionVisuals}>{content.visuals.map((visual, index) => <QuestionVisual key={`${visual.value}-${index}`} visual={visual} />)}</div>}
    {question.type === 'audio-choice' && !question.promptVoice && <div className={styles.listeningHint}>Nghe kỹ câu hỏi rồi chọn đáp án.</div>}
    <div role="radiogroup" aria-label={`Các lựa chọn câu ${question.number}`} className={styles.answerGroup}>
      {(question.options ?? []).map(option => <SingleOption
        key={option.id}
        questionId={question.id}
        option={option}
        selected={answer === option.id}
        disabled={disabled}
        playingId={playingId}
        onSelect={() => onAnswer(question.id, option.id)}
        onPlayAudio={onPlayAudio}
      />)}
    </div>
  </QuestionFrame>
}

function SingleOption({ questionId, option, selected, disabled, playingId, onSelect, onPlayAudio }: {
  questionId: string
  option: ExamOption
  selected: boolean
  disabled: boolean
  playingId: string | null
  onSelect(): void
  onPlayAudio(id: string, src: string): void
}) {
  const audioId = `${questionId}:${option.id}`
  return <div className={`${styles.answerRow} ${selected ? styles.answerRowSelected : ''}`}>
    <input type="radio" name={`answer-${questionId}`} value={option.id} checked={selected} disabled={disabled} onChange={onSelect} className={styles.answerRadio} aria-label={`Chọn đáp án ${option.label}${option.text ? `: ${option.text}` : ''}`} />
    <span className={styles.answerLabel}>{option.label ?? '•'}.</span>
    {option.visual && <span className={styles.answerVisual}><QuestionVisual visual={option.visual} compact /></span>}
    {option.text && (!option.visual || option.visual.value.normalize('NFC') !== option.text.normalize('NFC')) && <span className={styles.answerText}>{option.text}</span>}
    {option.voice && !option.text && !option.visual && <span className={styles.answerVoiceHint}>Nghe đáp án</span>}
    {option.voice && <ExamAudioButton compact active={playingId === audioId} label={`Nghe đáp án ${option.label ?? ''}`} onClick={() => onPlayAudio(audioId, option.voice!)} />}
  </div>
}
