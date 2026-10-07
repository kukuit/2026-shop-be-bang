'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import ExamAudioButton from '../ExamAudioButton'
import styles from '../exam.module.css'
import type { CommonSoundData, ExamOption, ImageResemblesLetterData, ImageWordAnalysisData } from '../../_exam/types'

export default function SelectInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const choices = question.data?.choices as string[] | undefined

  if (question.data?.generator === 'ANALYZE_WORD_FROM_IMAGE') {
    const data = question.data as unknown as ImageWordAnalysisData
    const selectedValue = typeof answer === 'string' ? answer : ''
    const sentenceVoice = data.sentenceVoice ?? []
    const sentenceAudioId = `${question.id}:sentence`
    return <QuestionFrame {...props}>
      <div className={styles.imageWordAnalysis}>
        {question.content?.type === 'visual' && question.content.visual && <div className={styles.imageWordAnalysisVisual}>
          <QuestionVisual visual={question.content.visual} maxDimension={150} />
          <span className={styles.imageWordAnalysisWord}>{data.item.word}</span>
        </div>}
        <div className={styles.imageWordAnalysisSentence}>
          <span>{data.sentencePrefix}</span>
          <select
            aria-label={`Chọn đáp án cho câu ${question.number}`}
            value={selectedValue}
            disabled={disabled}
            onChange={event => onAnswer(question.id, event.target.value)}
            className={styles.inlineQuestionSelect}
          >
            <option value="" disabled hidden>Chọn đáp án</option>
            {(question.options ?? []).map(option => <option key={option.id} value={option.id}>{option.text ?? option.id}</option>)}
          </select>
          <span>.</span>
        </div>
        <div className={styles.answerVoiceRow}>
          <ExamAudioButton
            compact
            active={props.playingId === sentenceAudioId}
            label={`Nghe câu hỏi về ${data.categoryLabel} ở câu ${question.number}`}
            disabled={sentenceVoice.length === 0}
            onClick={() => { if (sentenceVoice.length > 0) props.onPlayAudio(sentenceAudioId, sentenceVoice) }}
          />
        </div>
      </div>
    </QuestionFrame>
  }

  if (question.data?.generator === 'FIND_COMMON_SOUND') {
    const data = question.data as unknown as CommonSoundData
    const selectedValue = typeof answer === 'string' ? answer : ''
    const sentenceAudioId = `${question.id}:words`
    const voiceSequence = data.voiceSequence.filter(Boolean)
    return <QuestionFrame {...props}>
      <div className={styles.commonSoundSentence}>
        <span>{data.sentencePrefix}</span>
        <select
          aria-label={`Chọn âm chung cho câu ${question.number}`}
          value={selectedValue}
          disabled={disabled}
          onChange={event => onAnswer(question.id, event.target.value)}
          className={styles.inlineQuestionSelect}
        >
          <option value="" disabled hidden>Chọn đáp án</option>
          {(question.options ?? []).map(option => <option key={option.id} value={option.id}>{option.text ?? option.id}</option>)}
        </select>
        <span>.</span>
      </div>
      <div className={styles.answerVoiceRow}>
        <ExamAudioButton
          compact
          active={props.playingId === sentenceAudioId}
          label={`Nghe câu hỏi về âm chung ở câu ${question.number}`}
          disabled={voiceSequence.length !== 5}
          onClick={() => { if (voiceSequence.length === 5) props.onPlayAudio(sentenceAudioId, voiceSequence) }}
        />
      </div>
    </QuestionFrame>
  }

  if (question.data?.generator === 'IMAGE_RESEMBLES_LETTER') {
    const data = question.data as unknown as ImageResemblesLetterData
    const selectedValue = typeof answer === 'string' ? answer : ''
    return <QuestionFrame {...props}>
      <div className={styles.imageWordAnalysis}>
        {question.content?.type === 'visual' && question.content.visual && <div className={styles.imageResemblesLetterVisual}>
          <QuestionVisual visual={question.content.visual} maxDimension={160} />
        </div>}
        <div className={styles.imageWordAnalysisSentence}>
          <span>{data.sentencePrefix}</span>
          <select
            aria-label={`Chọn chữ cái cho câu ${question.number}`}
            value={selectedValue}
            disabled={disabled}
            onChange={event => onAnswer(question.id, event.target.value)}
            className={styles.inlineQuestionSelect}
          >
            <option value="" disabled hidden>Chọn đáp án</option>
            {(question.options ?? []).map(option => <option key={option.id} value={option.id}>{option.text ?? option.id}</option>)}
          </select>
          <span>.</span>
        </div>
      </div>
    </QuestionFrame>
  }

  return <QuestionFrame {...props}>
    {question.content?.type === 'visual' && question.content.visual && <div className="my-4 flex justify-center"><QuestionVisual visual={question.content.visual} /></div>}
    {question.content?.type === 'visuals' && question.content.visuals && <div className="my-4 flex flex-wrap justify-center gap-2">{question.content.visuals.map((visual, index) => <QuestionVisual key={`${visual.value}-${index}`} visual={visual} />)}</div>}
    <label className="mt-4 block max-w-md">
      <span className="mb-2 block text-sm font-bold text-slate-700">Chọn đáp án</span>
      <select value={typeof answer === 'string' ? answer : ''} disabled={disabled} onChange={event => onAnswer(question.id, event.target.value)} className="min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-xl font-extrabold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
        <option value="" disabled hidden>-- Chọn --</option>
        {(choices ?? question.options?.map((option: ExamOption) => option.id) ?? []).map(choice => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    </label>
  </QuestionFrame>
}
