'use client'

import type { VehicleOrderData } from '../../_exam/types'
import HorizontalSortableQuestion from '../HorizontalSortableQuestion'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import styles from '../exam.module.css'

export default function VehicleOrderQuestion(props: QuestionRendererProps) {
  const data = props.question.data as VehicleOrderData
  const ids = data.items.map(item => item.id)
  const itemById = new Map(data.items.map(item => [item.id, item]))
  const initialOrder = Array.isArray(props.answer) ? props.answer : ids

  return <QuestionFrame {...props}>
    <div className={styles.vehicleSortQuestion}>
      <p className={styles.questionPrompt}>{data.readoutText}</p>
      <HorizontalSortableQuestion
        questionId={props.question.id}
        itemIds={ids}
        initialOrder={initialOrder}
        disabled={props.disabled}
        containerClassName={styles.vehicleSortArea}
        itemClassName={styles.vehicleSortItem}
        getItemLabel={id => itemById.get(id)?.text ?? id}
        onOrderChange={order => props.onAnswer(props.question.id, order)}
        renderItem={id => {
          const item = itemById.get(id)
          if (!item) return null
          return <QuestionVisual visual={item.visual} compact maxDimension={72} />
        }}
      />
    </div>
  </QuestionFrame>
}
