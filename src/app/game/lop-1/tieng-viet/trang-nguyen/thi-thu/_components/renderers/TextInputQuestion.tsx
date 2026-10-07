'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import styles from '../exam.module.css'

type SceneItem = { id: string; label: string; emoji: string; letter: string }
type RotatedItem = { letter: string; rotation: number }

export default function TextInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const data = question.data ?? {}
  const scene = data.scene as SceneItem[] | undefined
  const letters = data.letters as RotatedItem[] | undefined
  return <QuestionFrame {...props}>
    {question.content?.type === 'visual' && question.content.visual && <div className="my-4 flex justify-center"><QuestionVisual visual={question.content.visual} /></div>}
    {scene && <div className="my-4 grid grid-cols-3 gap-2 rounded-xl bg-sky-50 p-3 sm:gap-4 sm:p-5">{scene.map(item => <div key={item.id} className="grid justify-items-center gap-2 rounded-xl bg-white p-3 shadow-sm"><span className="text-4xl" role="img" aria-label={item.label}>{item.emoji}</span><span className="rounded-lg bg-amber-50 px-3 py-1 text-2xl font-black">{item.letter}</span><span className="text-center text-xs font-semibold text-slate-600">{item.label}</span></div>)}</div>}
    {letters && <div className="my-4 flex flex-wrap justify-center gap-3 rounded-xl bg-slate-50 p-4">{letters.map((item, index) => <QuestionVisual key={`${item.letter}-${index}`} visual={{ type: 'letter-card', value: item.letter, rotation: item.rotation }} />)}</div>}
    <label className="mt-4 block max-w-md">
      <span className="mb-2 block text-sm font-bold text-slate-700">Câu trả lời</span>
      <input
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={typeof answer === 'string' ? answer : ''}
        onChange={event => onAnswer(question.id, event.target.value)}
        className={styles.numberCardAnswerInput}
        aria-label={`Nhập đáp án cho câu ${question.number}`}
      />
    </label>
  </QuestionFrame>
}
