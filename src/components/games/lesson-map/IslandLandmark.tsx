'use client'

import { useState } from 'react'
import type { LessonStatus } from './data'
import type { IslandLandmarkConfig, IslandLandmarkPosition } from './mathIslandLandmarks'
import styles from './IslandLandmark.module.css'

// Coordinates are local to the island's 200 × 135 SVG, never the viewport.
const positions: Record<IslandLandmarkPosition, [number, number]> = {
  'front-left': [53, 99], 'front-center': [100, 106], 'front-right': [147, 99],
  'back-left': [53, 87], 'back-center': [100, 87], 'back-right': [147, 87],
  'water-left': [49, 112], 'water-right': [151, 112],
}

export default function IslandLandmark({ icon, status, palmOnRight = false }: {
  icon: IslandLandmarkConfig; status: LessonStatus; palmOnRight?: boolean
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (failedSrc === icon.src) return null
  const [presetX, presetY] = positions[icon.position]
  const x = (palmOnRight ? 200 - presetX : presetX) + (icon.offsetX ?? 0)
  const y = presetY + (icon.offsetY ?? 0)
  const size = 46 * (icon.scale ?? 1) * (icon.checkpoint ? 1.12 : 1)

  return <g aria-hidden="true" className={styles.landmark} data-status={status} data-landmark={icon.id}
    transform={`translate(${x} ${y}) rotate(${icon.rotate ?? 0})`}>
    <image href={icon.src} x={-size / 2} y={-size} width={size} height={size}
      preserveAspectRatio="xMidYMax meet" onError={() => setFailedSrc(icon.src)} />
  </g>
}
