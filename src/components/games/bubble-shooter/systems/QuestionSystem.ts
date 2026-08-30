import type { MathQuestion } from '../types/game'

const shuffle = <T,>(items: T[]) => {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[target]] = [items[target], items[index]]
  }
  return items
}

export class QuestionSystem {
  private index = 0

  constructor(private readonly questions: MathQuestion[]) {}

  next(): MathQuestion {
    if (this.questions.length) {
      const source = this.questions[this.index % this.questions.length]
      this.index += 1
      return { ...source, options: shuffle([...source.options]) }
    }

    const first = Math.floor(Math.random() * 9) + 1
    const second = Math.floor(Math.random() * (10 - first)) + 1
    const answer = first + second
    const values = new Set<number>([answer])

    while (values.size < 6) values.add(Math.floor(Math.random() * 10) + 1)

    return {
      text: `${first} + ${second} = ?`,
      answer,
      options: shuffle(Array.from(values)),
    }
  }
}
