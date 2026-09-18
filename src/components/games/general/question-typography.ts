import type Phaser from 'phaser'

export const QUESTION_FONT = 'Game Nunito, Arial, sans-serif'

// Canvas must measure the real font before the first question is created.
export async function loadQuestionFont() {
  try {
    await document.fonts.load('700 48px "Game Nunito"', 'Tiếng Việt Ắ ễ ự')
  } catch {
    // The bundled font may be unavailable offline on a first visit.
    console.warn('Game question font unavailable; using Arial.')
  }
}

/** Fit colored words together, including accents and outlines, without truncation. */
export function fitQuestionWords(labels: Phaser.GameObjects.Text[], width: number, height: number, preferredSize = 58) {
  if (!labels.length) return
  let rows: Phaser.GameObjects.Text[][] = []
  let totalHeight = 0
  let gap = 0
  for (let size = preferredSize; size >= 18; size -= 2) {
    rows = [[]]
    gap = size * .22
    let rowWidth = 0
    for (const label of labels) {
      label.setFontSize(size)
      let row = rows[rows.length - 1]
      if (row.length && rowWidth + gap + label.width > width) {
        rows.push([])
        row = rows[rows.length - 1]
        rowWidth = 0
      }
      rowWidth += (row.length ? gap : 0) + label.width
      row.push(label)
    }
    totalHeight = rows.reduce((sum, row) => sum + Math.max(...row.map(label => label.height)), 0) + (rows.length - 1) * 4
    if (totalHeight <= height && labels.every(label => label.width <= width)) break
  }
  const scale = Math.min(1, height / totalHeight, width / Math.max(...labels.map(label => label.width)))
  let y = -totalHeight / 2
  for (const row of rows) {
    const rowHeight = Math.max(...row.map(label => label.height))
    const rowWidth = row.reduce((sum, label) => sum + label.width, 0) + (row.length - 1) * gap
    let x = -rowWidth / 2
    for (const label of row) {
      label.setPosition((x + label.width / 2) * scale, (y + rowHeight / 2) * scale).setScale(scale)
      x += label.width + gap
    }
    y += rowHeight + 4
  }
}
