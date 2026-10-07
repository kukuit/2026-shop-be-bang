'use client'

import { useState } from 'react'
import type { ExamAnswer, ExamQuestion } from '../../_exam/types'
import type { TestExamQuestion } from './test-types'
import ExamAudioButton from '../../_components/ExamAudioButton'
import QuestionRenderer, { type QuestionRendererProps } from '../../_components/QuestionRenderer'
import styles from './TestQuestionRenderer.module.css'

type Feedback = {
  submittedAnswer: ExamAnswer | undefined
  result: 'correct' | 'wrong' | 'unanswered' | 'unavailable'
}

function normalizeText(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase('vi-VN')
}

function sameRecord(left: Record<string, string>, right: Record<string, string>) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every(key => left[key] === right[key])
}

function isTestAnswerCorrect(type: ExamQuestion['type'], answer: ExamAnswer, expected: ExamAnswer): boolean {
  if (type === 'multi-select') {
    return Array.isArray(answer) && Array.isArray(expected)
      && answer.length === expected.length && new Set(answer).size === answer.length
      && answer.every(value => expected.includes(value))
  }
  if (Array.isArray(answer) || Array.isArray(expected)) {
    return type === 'sorting' && Array.isArray(answer) && Array.isArray(expected)
      && answer.length === expected.length && answer.every((value, index) => value === expected[index])
  }
  if (typeof answer === 'object' || typeof expected === 'object') {
    return typeof answer === 'object' && answer !== null && !Array.isArray(answer)
      && typeof expected === 'object' && expected !== null && !Array.isArray(expected)
      && sameRecord(answer, expected)
  }
  return normalizeText(answer) === normalizeText(expected)
}

function sameSubmission(left: ExamAnswer | undefined, right: ExamAnswer | undefined) {
  if (left === undefined || right === undefined) return left === right
  return JSON.stringify(left) === JSON.stringify(right)
}

export default function TestQuestionRenderer({
  question,
  testAnswer,
  ...rendererProps
}: Omit<QuestionRendererProps, 'question'> & { question: TestExamQuestion & { correctAnswer?: ExamAnswer }; testAnswer?: ExamAnswer }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const expected = testAnswer ?? question.testAnswer ?? question.correctAnswer
  const { testAnswer: _testAnswer, testTrailingVoice, correctAnswer: _correctAnswer, ...visibleQuestion } = question
  const trailingVoiceId = `${question.id}:test-trailing-voice`
  const currentFeedback = feedback && sameSubmission(feedback.submittedAnswer, rendererProps.answer) ? feedback : null

  function checkAnswer() {
    if (expected === undefined) {
      setFeedback({ submittedAnswer: rendererProps.answer, result: 'unavailable' })
    } else if (rendererProps.answer === undefined) {
      setFeedback({ submittedAnswer: undefined, result: 'unanswered' })
    } else {
      setFeedback({
        submittedAnswer: rendererProps.answer,
        result: isTestAnswerCorrect(question.type, rendererProps.answer, expected) ? 'correct' : 'wrong',
      })
    }
  }

  const feedbackText = currentFeedback?.result === 'correct'
    ? 'Đúng rồi!'
    : currentFeedback?.result === 'wrong'
      ? 'Chưa đúng, hãy thử lại.'
      : currentFeedback?.result === 'unanswered'
        ? 'Bạn chưa trả lời câu này.'
        : currentFeedback?.result === 'unavailable'
          ? 'Câu này chưa có đáp án để kiểm tra.'
          : null

  return <>
    {testTrailingVoice
      ? <div className={styles.questionWithTrailingVoice}>
        <QuestionRenderer {...rendererProps} question={visibleQuestion} />
        <div className={styles.trailingVoiceRow}>
          <ExamAudioButton
            active={rendererProps.playingId === trailingVoiceId}
            label={`Nghe câu hỏi hình ảnh trên giống chữ gì ở câu ${question.number}`}
            onClick={() => rendererProps.onPlayAudio(trailingVoiceId, testTrailingVoice)}
          />
        </div>
      </div>
      : <QuestionRenderer {...rendererProps} question={visibleQuestion} />}
    <div className={`${testTrailingVoice ? '' : '-mt-3'} mb-5 flex flex-wrap items-center gap-3 rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 px-4 py-3`}>
      <button
        type="button"
        disabled={rendererProps.disabled}
        onClick={checkAnswer}
        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >Kiểm tra đáp án</button>
      {feedbackText && <span
        role="status"
        aria-live="polite"
        className={`text-sm font-bold ${currentFeedback?.result === 'correct' ? 'text-emerald-700' : currentFeedback?.result === 'wrong' ? 'text-rose-700' : 'text-slate-600'}`}
      >{feedbackText}</span>}
    </div>
  </>
}
