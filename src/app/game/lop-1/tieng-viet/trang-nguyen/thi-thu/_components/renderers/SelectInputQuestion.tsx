'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

export default function SelectInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const choices = question.data?.choices as string[] | undefined
  return <QuestionFrame {...props}>
    {question.content?.type === 'visual' && question.content.visual && <div className="my-4 flex justify-center"><QuestionVisual visual={question.content.visual} /></div>}
    {question.content?.type === 'visuals' && question.content.visuals && <div className="my-4 flex flex-wrap justify-center gap-2">{question.content.visuals.map((visual, index) => <QuestionVisual key={`${visual.value}-${index}`} visual={visual} />)}</div>}
    <label className="mt-4 block max-w-md">
      <span className="mb-2 block text-sm font-bold text-slate-700">Chọn đáp án</span>
      <select value={typeof answer === 'string' ? answer : ''} disabled={disabled} onChange={event => onAnswer(question.id, event.target.value)} className="min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-xl font-extrabold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
        <option value="">-- Chọn --</option>
        {(choices ?? question.options?.map(option => option.id) ?? []).map(choice => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    </label>
  </QuestionFrame>
}
