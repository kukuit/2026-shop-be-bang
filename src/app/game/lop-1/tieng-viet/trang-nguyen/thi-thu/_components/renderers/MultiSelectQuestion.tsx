'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

export default function MultiSelectQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const selected = Array.isArray(answer) ? answer : []
  const visuals = question.content?.type === 'visuals' ? question.content.visuals : []
  return <QuestionFrame {...props}>
    {visuals && visuals.length > 0 && <div className="my-4 flex flex-wrap justify-center gap-2 rounded-xl bg-slate-50 p-4">{visuals.map((visual, index) => <QuestionVisual key={`${visual.value}-${index}`} visual={visual} />)}</div>}
    <div role="group" aria-label={`Chọn nhiều đáp án cho câu ${question.number}`} className="mt-4 grid gap-2 sm:grid-cols-2">
      {(question.options ?? []).map(option => {
        const checked = selected.includes(option.id)
        return <label key={option.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${checked ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'} ${disabled ? 'cursor-default opacity-70' : ''}`}>
          <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onAnswer(question.id, checked ? selected.filter(id => id !== option.id) : [...selected, option.id])} className="h-5 w-5 accent-blue-600" />
          <span className="w-7 shrink-0 font-bold">{option.label}.</span>
          {option.visual && <QuestionVisual visual={option.visual} compact />}
          {option.text && (!option.visual || option.visual.value.normalize('NFC') !== option.text.normalize('NFC')) && <span className="text-lg font-semibold">{option.text}</span>}
        </label>
      })}
    </div>
  </QuestionFrame>
}
