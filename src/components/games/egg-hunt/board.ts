export type Point = { x: number; y: number }
export type Cell = { id: number; points: Point[]; x: number; y: number; value: number | null }
export type EggStyle = 'green' | 'pink' | 'orange' | 'blue' | 'striped'
export type Egg = { id: number; x: number; y: number; surroundingCellIds: number[]; surroundingNumbers: number[]; spriteKey: EggStyle; collected: boolean }
export const TARGET = 6

// Transcribed from nhat-trung.png, left to right, top to bottom.
// An egg replaces a number; its triangle has no hidden numeric value.
export const REFERENCE_ROWS: readonly (readonly (number | EggStyle)[])[] = [
  [1, 2, 4, 2, 3, 5, 1, 6, 'green', 6, 5, 2, 'pink', 2, 3],
  [1, 4, 'orange', 4, 1, 6, 6, 'blue', 6, 3, 4, 5, 2, 'green', 2],
  [6, 3, 'pink', 3, 4, 3, 6, 6, 4, 1, 'green', 1, 6, 2, 3],
  [1, 5, 3, 5, 1, 'green', 1, 4, 4, 4, 1, 5, 4, 2, 1],
  [5, 'green', 5, 5, 5, 1, 4, 'blue', 4, 6, 5, 'striped', 5, 4, 5],
  [2, 5, 6, 4, 1, 3, 5, 6, 2, 'orange', 2, 3, 1, 4, 5],
  [2, 5, 'green', 5, 3, 3, 6, 3, 2, 2, 3, 3, 'striped', 3, 5],
  [5, 4, 5, 3, 'pink', 3, 1, 2, 'green', 2, 1, 4, 3, 3, 6],
]
const REFERENCE_CELLS = REFERENCE_ROWS.flat()
export const EGG_CELLS = REFERENCE_CELLS.flatMap((value, id) => typeof value === 'string' ? [id] : [])

// A continuous tessellation: 8 rows of 15 alternating triangles, as in the reference.
export function createBoard(): { cells: Cell[]; eggs: Egg[] } {
  const cells: Cell[] = REFERENCE_CELLS.map((value, id) => {
    const row = Math.floor(id / 15), col = id % 15
    const x = 8 + col * 21, y = 8 + row * 40
    const points = (row + col) % 2 === 0
      ? [{ x, y: y + 40 }, { x: x + 21, y }, { x: x + 42, y: y + 40 }]
      : [{ x, y }, { x: x + 42, y }, { x: x + 21, y: y + 40 }]
    return { id, points, x: x + 21, y: points.reduce((sum, p) => sum + p.y, 0) / 3, value: typeof value === 'number' ? value : null }
  })
  const eggs: Egg[] = EGG_CELLS.map(id => {
    const cell = cells[id]
    // Only numbered triangles physically touching this egg's triangle count.
    const neighbors = cells.filter(candidate => !EGG_CELLS.includes(candidate.id) && candidate.points.some(p => cell.points.some(q => p.x === q.x && p.y === q.y)))
    return { id, x: cell.x, y: cell.y, surroundingCellIds: neighbors.map(n => n.id), surroundingNumbers: neighbors.flatMap(n => n.value === null ? [] : [n.value]), spriteKey: REFERENCE_CELLS[id] as EggStyle, collected: false }
  })
  return { cells, eggs }
}

export function availableNumbers(eggs: Egg[]) {
  return Array.from(new Set(eggs.filter(egg => !egg.collected).flatMap(egg => egg.surroundingNumbers)))
}
export function canCollect(egg: Egg, result: number) {
  return !egg.collected && egg.surroundingNumbers.includes(result)
}
