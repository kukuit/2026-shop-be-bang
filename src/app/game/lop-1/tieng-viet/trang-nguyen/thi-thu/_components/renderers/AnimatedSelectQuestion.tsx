'use client'

import type { AnimatedQuestion24Data } from '../../_exam/types'
import ExamAudioButton from '../ExamAudioButton'
import styles from '../exam.module.css'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import AnimatedQuestionPlayer from './AnimatedQuestionPlayer'
import questionStyles from './AnimatedQuestionPlayer.module.css'

const MOTION_LABELS: Record<AnimatedQuestion24Data['motion'], string> = {
  fly: 'bay', run: 'chạy', jump: 'nhảy', walk: 'đi',
}

export default function AnimatedSelectQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer, playingId, onPlayAudio } = props
  const data = question.data as unknown as AnimatedQuestion24Data
  const voiceId = `${question.id}:animation-prompt`
  const targetName = data.targetMode === 'flower' ? 'hoa' : 'quả'
  const [actorFirstLetter, ...actorRest] = Array.from(data.actor.label)
  const actorName = `${actorFirstLetter?.toLocaleUpperCase('vi-VN') ?? ''}${actorRest.join('')}`
  const motionLabel = MOTION_LABELS[data.motion]

  return <QuestionFrame {...props}>
    <div className={questionStyles.animatedQuestion}>
      <AnimatedQuestionPlayer
        data={data}
        audioVolume={props.audioVolume}
        onAudioVolumeChange={props.onAudioVolumeChange}
      />
      <div className={questionStyles.answerLine}>
        <span>{actorName} {motionLabel} đến {targetName} có chữ</span>
        <select
          value={typeof answer === 'string' ? answer : ''}
          disabled={disabled}
          aria-label={`Chọn chữ trên ${targetName} tại điểm dừng của nhân vật`}
          onChange={event => onAnswer(question.id, event.target.value)}
          className={styles.inlineQuestionSelect}
        >
          <option value="" disabled>Chọn đáp án</option>
          {(question.options ?? []).map(option => <option key={option.id} value={option.id}>{option.text ?? option.id}</option>)}
        </select>
        <span>.</span>
      </div>
      <div className={styles.answerVoiceRow}>
        <ExamAudioButton
          compact
          active={playingId === voiceId}
          label={`Nghe câu ${question.number}`}
          disabled={data.voice.length === 0}
          onClick={() => { if (data.voice.length) onPlayAudio(voiceId, data.voice) }}
        />
      </div>
    </div>
  </QuestionFrame>
}
