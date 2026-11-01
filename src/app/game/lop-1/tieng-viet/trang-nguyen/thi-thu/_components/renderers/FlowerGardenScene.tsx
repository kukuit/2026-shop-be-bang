'use client'

import type { ExamVisual } from '../../_exam/types'
import styles from './FlowerGardenScene.module.css'

type Flower = { id: string; letter: string }
type PerchedAnimal = {
  id: string
  label: string
  visual: ExamVisual
  flowerIndex: number
}

type PerchConfig = {
  animalWidth: number
  footAnchorX: number
  footAnchorY: number
  perchOffsetX: number
  perchOffsetY: number
}

const FLOWER_CENTER_X = 150
const FLOWER_CENTER_Y = 86
const PERCH_POINT_X = 150
const PERCH_POINT_Y = 48

const PERCH_CONFIG: Record<string, PerchConfig> = {
  'chim-se': { animalWidth: 53, footAnchorX: 0.48, footAnchorY: 0.9, perchOffsetX: -9, perchOffsetY: 1 },
  ong: { animalWidth: 51, footAnchorX: 0.52, footAnchorY: 0.93, perchOffsetX: 8, perchOffsetY: 0 },
  qua: { animalWidth: 59, footAnchorX: 0.52, footAnchorY: 0.94, perchOffsetX: -8, perchOffsetY: 1 },
  en: { animalWidth: 63, footAnchorX: 0.38, footAnchorY: 0.82, perchOffsetX: 9, perchOffsetY: 0 },
}

const PLANT_SHAPES = [
  {
    stem: 'M 159 269 C 137 235 126 206 139 179 C 148 158 160 139 150 116',
    leaves: [
      { petiole: 'M 142 185 Q 133 181 123 176', shape: 'M 125 179 C 105 162 78 160 51 167 C 66 188 98 197 137 190 Q 143 188 148 191 Z' },
      { petiole: 'M 145 218 Q 156 214 165 208', shape: 'M 148 216 C 168 195 198 192 233 201 C 217 222 184 231 150 224 Z' },
    ],
  },
  {
    stem: 'M 143 269 C 174 234 132 205 152 177 C 167 155 140 137 150 116',
    leaves: [
      { petiole: 'M 151 180 Q 140 175 132 170', shape: 'M 134 173 C 114 156 87 155 62 162 C 75 183 105 192 145 184 Z' },
      { petiole: 'M 147 207 Q 159 202 167 197', shape: 'M 150 205 C 171 184 201 183 232 193 C 216 213 184 222 151 214 Z' },
      { petiole: 'M 149 234 Q 139 231 133 227', shape: 'M 135 230 C 119 216 99 215 80 221 C 91 238 115 244 147 240 Z' },
    ],
  },
  {
    stem: 'M 152 269 C 174 237 143 208 161 180 C 174 157 154 137 150 116',
    leaves: [
      { petiole: 'M 161 183 Q 172 177 181 172', shape: 'M 165 181 C 183 161 210 158 238 164 C 226 186 199 197 166 190 Z' },
      { petiole: 'M 155 218 Q 143 212 134 207', shape: 'M 137 213 C 117 193 88 191 58 200 C 74 220 104 230 151 222 Z' },
    ],
  },
] as const

const PETALS = [
  { x: 150, y: 64, rotation: 0 },
  { x: 171, y: 75, rotation: 55 },
  { x: 171, y: 99, rotation: 125 },
  { x: 150, y: 108, rotation: 180 },
  { x: 129, y: 99, rotation: 235 },
  { x: 129, y: 75, rotation: 305 },
] as const

function FlowerPlant({ flower, animal, plantIndex, sceneId }: {
  flower: Flower
  animal?: PerchedAnimal
  plantIndex: number
  sceneId: string
}) {
  const plant = PLANT_SHAPES[plantIndex] ?? PLANT_SHAPES[0]
  const sprite = animal?.visual.type === 'image' ? animal.visual.sprite : undefined
  const perch = animal ? PERCH_CONFIG[animal.id] : undefined
  const animalHeight = sprite && perch ? perch.animalWidth * sprite.height / sprite.width : 0
  const perchX = PERCH_POINT_X + (perch?.perchOffsetX ?? 0)
  const perchY = PERCH_POINT_Y + (perch?.perchOffsetY ?? 0)
  const animalX = perch && sprite ? perchX - perch.animalWidth * perch.footAnchorX : 0
  const animalY = perch ? perchY - animalHeight * perch.footAnchorY : 0
  const svgId = `t34-garden-${sceneId}-${flower.id}`.replace(/[^a-zA-Z0-9_-]/g, '')

  return <div className={styles.plantSlot}>
    <svg
      className={styles.plantSvg}
      viewBox="0 0 300 270"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Bông hoa chữ ${flower.letter}${animal ? `, bạn ${animal.label} đang đậu` : ''}`}
    >
      <defs>
        <linearGradient id={`${svgId}-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4f7934" />
          <stop offset="55%" stopColor="#75a34b" />
          <stop offset="100%" stopColor="#547d35" />
        </linearGradient>
        <linearGradient id={`${svgId}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#78a84b" />
          <stop offset="100%" stopColor="#527c35" />
        </linearGradient>
        <radialGradient id={`${svgId}-petal`} cx="35%" cy="24%" r="78%">
          <stop offset="0%" stopColor="#f6c7f2" />
          <stop offset="72%" stopColor="#e3a0e9" />
          <stop offset="100%" stopColor="#cd7dd8" />
        </radialGradient>
      </defs>

      <path className={styles.plantStem} d={plant.stem} fill={`url(#${svgId}-stem)`} />
      <g fill={`url(#${svgId}-leaf)`}>
        {plant.leaves.map((leaf, leafIndex) => <g key={leafIndex}>
          <path className={styles.leafPetiole} d={leaf.petiole} />
          <path className={styles.leafShape} d={leaf.shape} />
        </g>)}
      </g>

      <g className={styles.flowerPetals} fill={`url(#${svgId}-petal)`}>
        {PETALS.map((petal, petalIndex) => <ellipse
          key={petalIndex}
          cx={petal.x}
          cy={petal.y}
          rx="18"
          ry="25"
          transform={`rotate(${petal.rotation} ${petal.x} ${petal.y})`}
        />)}
      </g>
      <circle className={styles.flowerCenterOuter} cx={FLOWER_CENTER_X} cy={FLOWER_CENTER_Y} r="18" />
      <circle className={styles.flowerCenterInner} cx={FLOWER_CENTER_X} cy={FLOWER_CENTER_Y} r="13.5" />
      <text className={styles.flowerLetter} x={FLOWER_CENTER_X} y={FLOWER_CENTER_Y}>{flower.letter}</text>

      {animal && sprite && perch && <>
        <ellipse className={styles.contactShadow} cx={perchX} cy={perchY + 1.5} rx="10" ry="2" />
        <svg
          className={styles.perchedAnimal}
          x={animalX}
          y={animalY}
          width={perch.animalWidth}
          height={animalHeight}
          viewBox={`0 0 ${sprite.width} ${sprite.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <image
            href={sprite.spriteSheet}
            x={-sprite.x}
            y={-sprite.y}
            width={sprite.sheetWidth}
            height={sprite.sheetHeight}
            preserveAspectRatio="xMidYMid meet"
            style={{ objectFit: 'contain' }}
          />
        </svg>
      </>}
    </svg>
  </div>
}

export default function FlowerGardenScene({ flowers, animals, sceneId }: {
  flowers: Flower[]
  animals: PerchedAnimal[]
  sceneId: string
}) {
  return <div className={styles.garden} aria-label="Khu vườn có ba bông hoa, hai con vật đang đậu">
    <span className={styles.sun} aria-hidden="true">☀️</span>
    <span className={styles.cloud} aria-hidden="true">☁️</span>
    <div className={styles.gardenRow}>
      {flowers.map((flower, flowerIndex) => <FlowerPlant
        key={flower.id}
        flower={flower}
        animal={animals.find(item => item.flowerIndex === flowerIndex)}
        plantIndex={flowerIndex}
        sceneId={sceneId}
      />)}
    </div>
  </div>
}
