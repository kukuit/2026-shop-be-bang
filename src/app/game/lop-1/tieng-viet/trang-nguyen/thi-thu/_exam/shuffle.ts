export function createSeededRandom(seed: string): () => number {
  let state = 2166136261
  for (const character of seed.normalize('NFC')) {
    state ^= character.codePointAt(0) ?? 0
    state = Math.imul(state, 16777619)
  }
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const output = [...items]
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[output[index], output[swapIndex]] = [output[swapIndex], output[index]]
  }
  return output
}

export function pick<T>(items: readonly T[], random: () => number): T {
  if (!items.length) throw new Error('Cannot pick from an empty question pool')
  return items[Math.floor(random() * items.length)]
}

export function pickDistractors<T>(args: { pool: readonly T[]; exclude: readonly T[]; count: number; random: () => number }): T[] {
  const excluded = new Set(args.exclude)
  const candidates = Array.from(new Set(args.pool.filter(item => !excluded.has(item))))
  if (candidates.length < args.count) throw new Error(`Distractor pool needs ${args.count} unique values`)
  return shuffle(candidates, args.random).slice(0, args.count)
}

export function stableHash(value: string): string {
  let hash = 2166136261
  for (const character of value.normalize('NFC')) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}
