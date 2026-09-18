import type { LearningQuestion } from '../general/learning-question'

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Choose a fresh variant for each goal before filling any remaining rounds.
export function sampleEnglishQuestions(pool: readonly LearningQuestion[], count = 10): LearningQuestion[] {
  const randomized = shuffle(pool)
  const goals = Array.from(new Set(randomized.map(q => q.goalKey)))
  const required = goals.map(goal => randomized.find(q => q.goalKey === goal)!)
  return shuffle([...required, ...randomized.filter(q => !required.includes(q))].slice(0, count))
    .map(q => ({ ...q, options: q.options ? shuffle(q.options) : undefined }))
}
