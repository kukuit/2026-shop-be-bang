# Vocabulary sprite sheets

Place licensed source images in a folder named for the sheet, with filenames equal
to stable vocabulary IDs (for example `en-cat.png`). Then run:

```sh
npm run vocabulary:sprites -- src/data/vocabulary/images/animals-01
npm run vocabulary:import
npm run vocabulary:validate
```

The packer sorts filenames lexicographically, uses transparent 256×256 cells in a
10×10 sheet, and leaves 12 pixels of inset around each image. Index 0 is the first
file, moving left to right and then top to bottom. Without the optional `sharp`
package it writes a self-contained SVG sheet; pass `--webp` after installing
`sharp` to require a transparent WebP output. The packer updates reviewed image
references and writes a per-sheet manifest. It does not create or claim images for
words that have no source asset.

No vocabulary image assets are currently included.
