/** Small deterministic-friendly utilities shared by lesson question adapters. */
export function shuffle<T>(values: readonly T[], random = Math.random): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}
