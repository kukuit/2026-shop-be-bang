'use client'

import type { AlphabetOrderData } from '../../_exam/types'
import HorizontalSortableQuestion from '../HorizontalSortableQuestion'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import styles from '../exam.module.css'

export default function AlphabetOrderQuestion(props: QuestionRendererProps) {
  const data = props.question.data as AlphabetOrderData
  const ids = data.items.map(item => item.id)
  const valueById = new Map(data.items.map(item => [item.id, item.value]))
  const initialOrder = Array.isArray(props.answer) ? props.answer : ids

  return <QuestionFrame {...props}>
    <div className={styles.alphabetSortQuestion}>
      <HorizontalSortableQuestion
        questionId={props.question.id}
        itemIds={ids}
        initialOrder={initialOrder}
        disabled={props.disabled}
        onOrderChange={order => props.onAnswer(props.question.id, order)}
        renderItem={id => valueById.get(id) ?? ''}
      />
    </div>
  </QuestionFrame>
}
