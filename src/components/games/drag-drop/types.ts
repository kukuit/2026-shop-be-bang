export type NumberValue = 0 | 1 | 2 | 3 | 4 | 5
export type LevelType = 'count' | 'sequence' | 'sort' | 'mixed'

export type CountGroup = { id: string; icon: string; count: NumberValue; label: string }
export type SequenceCell = { id: string; value: NumberValue; target?: boolean }

export type DragDropLevel = {
  id: number
  type: LevelType
  title: string
  instruction: string
  groups?: CountGroup[]
  sequence?: SequenceCell[]
  answers: Record<string, NumberValue>
}
