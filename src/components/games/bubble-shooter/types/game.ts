export interface MathQuestion {
  text: string
  answer: number
  options: number[]
}

export interface LessonData {
  id: string
  title: string
  type: 'math-addition'
  questions: MathQuestion[]
}
