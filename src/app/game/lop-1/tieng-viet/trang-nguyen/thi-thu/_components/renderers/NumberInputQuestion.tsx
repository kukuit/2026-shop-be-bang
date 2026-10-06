'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

export default function NumberInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const grid = question.data?.grid as string[] | undefined
  return <QuestionFrame {...props}>
    {question.content?.type === 'visuals' && question.content.visuals && <div className="my-4 flex flex-wrap justify-center gap-1 rounded-xl bg-slate-50 p-4">{question.content.visuals.map((visual, index) => <QuestionVisual key={index} visual={visual} compact />)}</div>}
    {grid && <div className="my-4 mx-auto grid max-w-xs grid-cols-4 gap-2 rounded-xl bg-slate-50 p-4" aria-label="Bảng chữ cái cần đếm">{grid.map((letter, index) => <span key={`${letter}-${index}`} className={`grid h-12 place-items-center rounded-lg bg-white text-xl font-black shadow-sm ${letter === question.data?.targetLetter ? 'text-blue-700' : 'text-slate-700'}`}>{letter}</span>)}</div>}
    <label className="mt-4 block max-w-xs">
      <span className="mb-2 block text-sm font-bold text-slate-700">Nhập số</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        disabled={disabled}
        value={typeof answer === 'string' ? answer : ''}
        onChange={event => { if (/^\d*$/.test(event.target.value)) onAnswer(question.id, event.target.value) }}
        className="min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-2xl font-extrabold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        aria-label={`Nhập số cho câu ${question.number}`}
      />
    </label>
  </QuestionFrame>
}
