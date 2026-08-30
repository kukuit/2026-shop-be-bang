import type { BubbleShooterGameConfig, MathQuestion } from '@/components/games/bubble-shooter/types/game'

const createAdditionQuestion = (): MathQuestion => {
  const first = Math.floor(Math.random() * 9) + 1
  const second = Math.floor(Math.random() * (10 - first)) + 1
  const answer = first + second
  const values = new Set<number>([answer])
  while (values.size < 6) values.add(Math.floor(Math.random() * 10) + 1)
  return { text: `${first} + ${second} = ?`, answer, options: Array.from(values) }
}

export const CONG_DEN_10_BUBBLE_SHOOTER_CONFIG: BubbleShooterGameConfig = {
  id: 'toan-1-luyen-tap-cong-den-10',
  title: 'Phép cộng đến 10',
  totalRounds: 10,
  loadQuestions: () => Array.from({ length: 10 }, createAdditionQuestion),
}
