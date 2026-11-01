'use client'

import { useState } from 'react'
import ExamAudioButton from '../../_components/ExamAudioButton'
import FlowerGardenScene from '../../_components/renderers/FlowerGardenScene'
import { useExamAudio } from '../../_hooks/useExamAudio'
import { createSeededRandom } from '../../_exam/shuffle'
import {
  QUESTION_34_BAN_VOICE,
  QUESTION_34_FLOWER_QUESTION_VOICE,
  QUESTION_34_PROMPT,
  QUESTION_34_PROMPT_VOICE,
  generateQuestion34TestRound,
  type Question34TestRound,
} from '../../_exam/question34-knowledge'
import styles from './QuestionT34SubN4TestClient.module.css'

const QUESTION_COUNT = 10

function makeQuestionSet(seed: string): Question34TestRound[] {
  return Array.from({ length: QUESTION_COUNT }, (_, index) => {
    const questionSeed = `${seed}:question-${index}`
    return generateQuestion34TestRound({ seedHash: questionSeed, random: createSeededRandom(questionSeed) })
  })
}

function createAnimalVoice(animalVoice: string): string[] {
  return [QUESTION_34_BAN_VOICE, animalVoice, QUESTION_34_FLOWER_QUESTION_VOICE]
}

export default function QuestionT34SubN4TestClient({ initialQuestions }: { initialQuestions: Question34TestRound[] }) {
  const { playingId, play, stop, volume, setVolume } = useExamAudio()
  const [questions, setQuestions] = useState(initialQuestions)
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({})
  const [checked, setChecked] = useState(false)

  function startNewRound() {
    stop()
    setQuestions(makeQuestionSet(`${Date.now()}:${Math.random()}`))
    setAnswers({})
    setChecked(false)
  }

  function checkAnswers() {
    stop()
    setChecked(true)
  }

  const correctCount = questions.reduce((count, question) => count + question.animals.filter(animal => {
    const expected = question.flowers[animal.flowerIndex]?.letter ?? ''
    const answer = answers[question.id]?.[animal.id] ?? ''
    return answer.normalize('NFC').trim().toLocaleLowerCase('vi-VN') === expected
  }).length, 0)

  return <main className={styles.test}>
    <section className={styles.instructions} aria-label="Hướng dẫn câu 34">
      <div className={styles.prompt}>
        <p>{QUESTION_34_PROMPT}</p>
        <ExamAudioButton
          active={playingId === 't34:prompt'}
          label="Nghe hướng dẫn câu 34"
          onClick={() => play('t34:prompt', QUESTION_34_PROMPT_VOICE)}
        />
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={checkAnswers}>Kiểm tra 10 câu</button>
        <button type="button" onClick={startNewRound}>Tạo 10 câu mới</button>
        <label className={styles.volume}>
          Âm lượng
          <input aria-label="Âm lượng giọng đọc" type="range" min="0" max="1" step="0.05" value={volume} onChange={event => setVolume(Number(event.target.value))} />
        </label>
        {checked && <span className={styles.score} role="status">Đúng {correctCount}/{questions.length * 2} đáp án</span>}
      </div>
    </section>

    {questions.map((question, questionIndex) => <section className={styles.question} key={question.id} aria-label={`Câu thử ${questionIndex + 1}`}>
      <h2 className={styles.questionTitle}>Câu thử {questionIndex + 1}</h2>
      <FlowerGardenScene sceneId={question.id} flowers={question.flowers} animals={question.animals} />

      <div className={styles.animalQuestions}>
        {question.animals.map(animal => {
          const answer = answers[question.id]?.[animal.id] ?? ''
          const expected = question.flowers[animal.flowerIndex]?.letter ?? ''
          const isCorrect = answer.normalize('NFC').trim().toLocaleLowerCase('vi-VN') === expected
          return <div className={styles.animalQuestion} key={animal.id}>
            <label className={styles.answerLine}>
              <span>{`Bạn ${animal.label} đậu trên bông hoa có chữ gì?`}</span>
              <input
                aria-label={`Chữ trên bông hoa của bạn ${animal.label}, câu thử ${questionIndex + 1}`}
                autoComplete="off"
                maxLength={1}
                value={answer}
                onChange={event => {
                  setAnswers(current => ({
                    ...current,
                    [question.id]: { ...(current[question.id] ?? {}), [animal.id]: event.target.value },
                  }))
                  setChecked(false)
                }}
              />
              <span>.</span>
            </label>
            <div className={styles.voiceRow}>
              <ExamAudioButton
                compact
                active={playingId === `${question.id}:${animal.id}`}
                label={`Nghe câu hỏi về bạn ${animal.label}, câu thử ${questionIndex + 1}`}
                onClick={() => play(`${question.id}:${animal.id}`, createAnimalVoice(animal.voice))}
              />
              {checked && <span role="status" className={`${styles.result} ${isCorrect ? styles.correct : styles.incorrect}`}>
                {answer ? isCorrect ? 'Đúng' : `Chưa đúng · ${expected}` : `Chưa điền · ${expected}`}
              </span>}
            </div>
          </div>
        })}
      </div>
    </section>)}
    <p className={styles.note}>Mỗi câu có 3 bông hoa với 3 chữ khác nhau và 2 con vật trên hai bông hoa. Hoa được tạo bằng HTML/CSS; con vật lấy từ tag-name.webp.</p>
  </main>
}
