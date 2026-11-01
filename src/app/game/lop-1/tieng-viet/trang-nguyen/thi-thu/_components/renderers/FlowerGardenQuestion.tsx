'use client'

import ExamAudioButton from '../ExamAudioButton'
import { sanitizeSingleVietnameseLetter } from '../../_exam/answer-utils'
import {
  QUESTION_34_BAN_VOICE,
  QUESTION_34_FLOWER_QUESTION_VOICE,
  type Question34TestRound,
} from '../../_exam/question34-knowledge'
import FlowerGardenScene from './FlowerGardenScene'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import styles from './FlowerGardenQuestion.module.css'

export default function FlowerGardenQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const data = question.data ?? {}
  const flowers = data.flowers as Question34TestRound['flowers'] | undefined
  const animals = data.animals as Question34TestRound['animals'] | undefined
  const allowedLetters = Array.isArray(data.allowedLetters)
    ? data.allowedLetters.filter((letter): letter is string => typeof letter === 'string')
    : []
  const answerMap = answer && typeof answer === 'object' && !Array.isArray(answer)
    ? answer as Record<string, string> : {}

  if (!flowers || !animals) return <QuestionFrame {...props}><p>Không tải được khu vườn câu hỏi.</p></QuestionFrame>

  return <QuestionFrame {...props}>
    <FlowerGardenScene sceneId={question.id} flowers={flowers} animals={animals} />
    <div className={styles.animalQuestions}>
      {animals.map(animal => {
        const voiceId = `${question.id}:${animal.id}`
        return <div className={styles.animalQuestion} key={animal.id}>
          <label className={styles.answerLine}>
            <span>{`Bạn ${animal.label} đậu trên bông hoa có chữ gì?`}</span>
            <input
              type="text"
              autoComplete="off"
              maxLength={1}
              disabled={disabled}
              value={answerMap[animal.id] ?? ''}
              onChange={event => onAnswer(question.id, {
                ...answerMap,
                [animal.id]: sanitizeSingleVietnameseLetter(event.target.value, allowedLetters),
              })}
              aria-label={`Chữ trên bông hoa của bạn ${animal.label}, câu ${question.number}`}
            />
            <span>.</span>
          </label>
          <div className={styles.voiceRow}>
            <ExamAudioButton
              compact
              active={playingId === voiceId}
              disabled={disabled}
              label={`Nghe câu hỏi về bạn ${animal.label}, câu ${question.number}`}
              onClick={() => onPlayAudio(voiceId, [QUESTION_34_BAN_VOICE, animal.voice, QUESTION_34_FLOWER_QUESTION_VOICE])}
            />
          </div>
        </div>
      })}
    </div>
  </QuestionFrame>
}
