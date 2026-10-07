'use client'

import ExamAudioButton from '../ExamAudioButton'
import type { ExamOption } from '../../_exam/types'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import styles from '../exam.module.css'

export default function SingleChoiceQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const content = question.content
  const findTargetObjects = question.templateId === 'T01'
  const tagNameChoices = question.data?.generator === 'FIND_LETTER_IN_ANIMAL_NAME'
  const toneVoiceOnlyChoices = question.data?.generator === 'IDENTIFY_TONE_FROM_SYLLABLE'
  const flowerVoiceOnlyChoices = question.data?.generator === 'FIND_FLOWER_BY_IMAGE'
  const voiceOnlyChoices = toneVoiceOnlyChoices || flowerVoiceOnlyChoices
  const visuals = findTargetObjects
    ? (question.options ?? []).flatMap(option => option.visual ? [option.visual] : [])
    : content?.type === 'visuals' ? content.visuals : undefined
  return <QuestionFrame {...props}>
    {content?.type === 'text' && <div className={styles.questionContent}>{content.text}</div>}
    {content?.type === 'visual' && content.visual && <div className={`${styles.questionVisuals} ${flowerVoiceOnlyChoices ? styles.flowerQuestionVisuals : ''}`}><QuestionVisual visual={content.visual} large={flowerVoiceOnlyChoices} /></div>}
    {visuals && <div className={`${styles.questionVisuals} ${findTargetObjects ? styles.findTargetVisuals : ''}`} role={findTargetObjects ? 'group' : undefined} aria-label={findTargetObjects ? `Các hình lựa chọn cho câu ${question.number}` : undefined}>{visuals.map((visual, index) => <QuestionVisual key={`${visual.value}-${index}`} visual={visual} />)}</div>}
    {question.type === 'audio-choice' && !question.promptVoice && <div className={styles.listeningHint}>Nghe kỹ câu hỏi rồi chọn đáp án.</div>}
    <div role="radiogroup" aria-label={`Các lựa chọn câu ${question.number}`} className={`${styles.answerGroup} ${findTargetObjects ? styles.answerGroupFindObjects : ''} ${question.templateId === 'T01' && !findTargetObjects ? styles.answerGroupStar : ''} ${question.templateId === 'T02' ? styles.answerGroupImage : ''} ${flowerVoiceOnlyChoices ? styles.answerGroupFlowerVoice : ''}`}>
      {(question.options ?? []).map(option => <SingleOption
        key={option.id}
        questionId={question.id}
        option={voiceOnlyChoices ? { ...option, text: undefined, ...(flowerVoiceOnlyChoices ? { visual: undefined } : {}) } : option}
        selected={answer === option.id}
        disabled={disabled}
        playingId={playingId}
        objectChoice={findTargetObjects}
        tagNameChoice={tagNameChoices}
        audioOnly={question.templateId === 'T01' || voiceOnlyChoices}
        voiceOnlyChoice={flowerVoiceOnlyChoices}
        largeVisual={question.templateId === 'T02'}
        onSelect={() => onAnswer(question.id, option.id)}
        onPlayAudio={onPlayAudio}
      />)}
    </div>
  </QuestionFrame>
}

function SingleOption({ questionId, option, selected, disabled, playingId, audioOnly, largeVisual, objectChoice, tagNameChoice, voiceOnlyChoice, onSelect, onPlayAudio }: {
  questionId: string
  option: ExamOption
  selected: boolean
  disabled: boolean
  playingId: string | null
  audioOnly: boolean
  largeVisual: boolean
  objectChoice: boolean
  tagNameChoice: boolean
  voiceOnlyChoice: boolean
  onSelect(): void
  onPlayAudio(id: string, src: string): void
}) {
  const audioId = `${questionId}:${option.id}`
  return <div
    className={`${styles.answerRow} ${largeVisual ? styles.answerRowLargeVisual : ''} ${objectChoice ? styles.answerRowFindObject : ''} ${selected ? styles.answerRowSelected : ''}`}
  >
    <input type="radio" name={`answer-${questionId}`} value={option.id} checked={selected} disabled={disabled} onChange={onSelect} className={styles.answerRadio} aria-label={`Chọn đáp án ${option.label}${option.text ? `: ${option.text}` : option.visual?.value ? `, chữ ${option.visual.value}` : ''}`} />
    <span className={styles.answerLabel}>{option.label ?? '•'}.</span>
    {tagNameChoice && <span className={styles.answerTagNameContent}>
      {option.visual && <span className={styles.answerTagNameVisual}><QuestionVisual visual={option.visual} compact={false} /></span>}
      {option.text && <span className={styles.answerTagNameText}>{option.text}</span>}
    </span>}
    {!tagNameChoice && option.visual && !objectChoice && <span className={styles.answerVisual}><QuestionVisual visual={option.visual} compact={!largeVisual} /></span>}
    {!tagNameChoice && option.text && (!option.visual || option.visual.value.normalize('NFC') !== option.text.normalize('NFC')) && <span className={styles.answerText}>{option.text}</span>}
    {option.voice && !option.text && !option.visual && !audioOnly && <span className={styles.answerVoiceHint}>Nghe đáp án</span>}
    {option.voice && <ExamAudioButton active={playingId === audioId} label={voiceOnlyChoice ? `Nghe đáp án ${option.label ?? ''}` : `Nghe chữ ${option.visual?.value ?? option.label ?? ''}`} onClick={() => onPlayAudio(audioId, option.voice!)} />}
  </div>
}
