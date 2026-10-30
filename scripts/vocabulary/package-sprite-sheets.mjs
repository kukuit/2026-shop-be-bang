import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const inputArg = process.argv[2]
const wantsWebp = process.argv.includes('--webp')
if (!inputArg || inputArg.startsWith('--')) {
  console.error('Usage: npm run vocabulary:sprites -- <directory-of-word-images> [--webp]')
  console.error('Use filenames matching stable vocabulary IDs, for example en-cat.png.')
  process.exit(1)
}

const inputDir = path.resolve(root, inputArg)
const files = (await readdir(inputDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, 'en'))
if (!files.length) throw new Error(`No supported images found in ${inputDir}.`)
if (files.length > 100) throw new Error(`A sprite sheet supports at most 100 images; found ${files.length}.`)

const reviewedPath = path.join(root, 'src/data/vocabulary/reviewed-content.json')
const reviewed = JSON.parse(await readFile(reviewedPath, 'utf8'))
const reviewedById = new Map(reviewed.map((word) => [word.id, word]))
const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml' }
const cellSize = 256
const gutter = 12
const sheetName = path.basename(inputDir).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'vocabulary'
const items = []
const imageNodes = []

for (const [index, fileName] of files.entries()) {
  const id = path.basename(fileName, path.extname(fileName)).toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid word ID in filename: ${fileName}`)
  if (!reviewedById.has(id)) throw new Error(`No reviewed vocabulary item has ID ${id}. Add its editorial entry before packaging an image.`)
  const mime = mimeTypes[path.extname(fileName).toLowerCase()]
  const bytes = await readFile(path.join(inputDir, fileName))
  const x = (index % 10) * cellSize + gutter
  const y = Math.floor(index / 10) * cellSize + gutter
  imageNodes.push(`<image href="data:${mime};base64,${bytes.toString('base64')}" x="${x}" y="${y}" width="${cellSize - gutter * 2}" height="${cellSize - gutter * 2}" preserveAspectRatio="xMidYMid meet"/>`)
  items.push({ id, index })
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="2560" viewBox="0 0 2560 2560">${imageNodes.join('')}</svg>`
const publicDir = path.join(root, 'public/games/vocabulary/sprites')
const manifestDir = path.join(root, 'src/data/vocabulary/sprites')
await mkdir(publicDir, { recursive: true })
await mkdir(manifestDir, { recursive: true })

let outputName = `${sheetName}.svg`
if (wantsWebp || !process.argv.includes('--svg')) {
  try {
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default
    outputName = `${sheetName}.webp`
    await sharp(Buffer.from(svg)).webp({ quality: 88, alphaQuality: 90, effort: 5 }).toFile(path.join(publicDir, outputName))
  } catch (error) {
    if (wantsWebp) throw new Error(`WebP output needs the optional sharp package. Install it with npm install --save-dev sharp. ${error instanceof Error ? error.message : ''}`)
    outputName = `${sheetName}.svg`
    await writeFile(path.join(publicDir, outputName), svg)
  }
} else {
  await writeFile(path.join(publicDir, outputName), svg)
}

for (const { id, index } of items) {
  reviewedById.get(id).image = { type: 'sprite', sheet: outputName, index }
}
await writeFile(reviewedPath, `${JSON.stringify(reviewed, null, 2)}\n`)
await writeFile(path.join(manifestDir, `${sheetName}.json`), `${JSON.stringify({ rows: 10, columns: 10, cellSize, transparent: true, sheet: outputName, items }, null, 2)}\n`)
console.log(`Packed ${items.length} images into public/games/vocabulary/sprites/${outputName}.`)
console.log(`Updated reviewed-content.json and src/data/vocabulary/sprites/${sheetName}.json; run npm run vocabulary:import to refresh game chunks.`)
