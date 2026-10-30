export const VOCABULARY_SPRITE_COLUMNS = 10
export const VOCABULARY_SPRITE_ROWS = 10
export const VOCABULARY_SPRITE_CELL_SIZE = 256

export function getVocabularySpriteCell(sheet: string, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= VOCABULARY_SPRITE_COLUMNS * VOCABULARY_SPRITE_ROWS) {
    throw new RangeError(`Vocabulary sprite index must be between 0 and 99; received ${index}`)
  }
  const safeSheet = sheet.replace(/^\/+/, '')
  return {
    src: `/games/vocabulary/sprites/${safeSheet}`,
    row: Math.floor(index / VOCABULARY_SPRITE_COLUMNS),
    column: index % VOCABULARY_SPRITE_COLUMNS,
    rows: VOCABULARY_SPRITE_ROWS,
    columns: VOCABULARY_SPRITE_COLUMNS,
  }
}

export function getVocabularySpritePosition(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= VOCABULARY_SPRITE_COLUMNS * VOCABULARY_SPRITE_ROWS) {
    throw new RangeError(`Vocabulary sprite index must be between 0 and 99; received ${index}`)
  }
  const row = Math.floor(index / VOCABULARY_SPRITE_COLUMNS)
  const column = index % VOCABULARY_SPRITE_COLUMNS
  return {
    row,
    column,
    backgroundSize: `${VOCABULARY_SPRITE_COLUMNS * 100}% ${VOCABULARY_SPRITE_ROWS * 100}%`,
    backgroundPosition: `${column / (VOCABULARY_SPRITE_COLUMNS - 1) * 100}% ${row / (VOCABULARY_SPRITE_ROWS - 1) * 100}%`,
  }
}
