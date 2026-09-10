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
    // A neighboring triangle must share an entire edge (two vertices).
    // Triangles touching only at a corner do not determine this egg's number.
    const neighbors = cells.filter(candidate => candidate.value !== null && candidate.points.filter(p => cell.points.some(q => p.x === q.x && p.y === q.y)).length === 2)
    return { id, x: cell.x, y: cell.y, surroundingCellIds: neighbors.map(n => n.id), surroundingNumbers: neighbors.flatMap(n => n.value === null ? [] : [n.value]), spriteKey: REFERENCE_CELLS[id] as EggStyle, collected: false }
  })
  return { cells, eggs }
}

export function createRandomBoard(random: () => number = Math.random): { cells: Cell[]; eggs: Egg[] } {
  const { cells } = createBoard()
  const shuffle = <T,>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }
  const neighbors = cells.map(cell => cells.filter(candidate => candidate.id !== cell.id && candidate.points.filter(p => cell.points.some(q => p.x === q.x && p.y === q.y)).length === 2).map(cell => cell.id))
  const candidates = cells.filter(cell => neighbors[cell.id].length === 3).map(cell => cell.id)
  let positions: number[] = []
  // Reserve each egg and its three bordering cells to prevent conflicting answers.
  for (let attempt = 0; attempt < 32; attempt++) {
    const reserved = new Set<number>()
    positions = []
    for (const id of shuffle([...candidates])) {
      const area = [id, ...neighbors[id]]
      if (area.some(cellId => reserved.has(cellId))) continue
      positions.push(id)
      area.forEach(cellId => reserved.add(cellId))
      if (positions.length === EGG_CELLS.length) break
    }
    if (positions.length === EGG_CELLS.length) break
  }
  // Verified disjoint fallback keeps generation bounded for unusual RNG sequences.
  if (positions.length !== EGG_CELLS.length) positions = [94, 64, 85, 76, 2, 21, 12, 98, 36, 40, 102, 61, 31, 57, 49, 111]
  const answers = shuffle(positions.map((_, index) => index % 6 + 1))
  const colors: EggStyle[] = ['green', 'pink', 'orange', 'blue', 'striped']
  cells.forEach(cell => { cell.value = 1 + Math.floor(random() * 6) })
  const eggs = positions.map((id, index): Egg => {
    const cell = cells[id]
    cell.value = null
    neighbors[id].forEach(cellId => { cells[cellId].value = answers[index] })
    return { id, x: cell.x, y: cell.y, surroundingCellIds: [...neighbors[id]], surroundingNumbers: Array(3).fill(answers[index]), spriteKey: colors[Math.floor(random() * colors.length)], collected: false }
  })
  return { cells, eggs }
}

export function availableNumbers(eggs: Egg[], rollCounts: Readonly<Record<number, number>> = {}) {
  return Array.from(new Set(eggs.filter(egg => !egg.collected).flatMap(egg => egg.surroundingNumbers)))
    .filter(number => (rollCounts[number] ?? 0) < 2)
}
export function canCollect(egg: Egg, result: number) {
  return !egg.collected && egg.surroundingNumbers.includes(result)
}
