'use client'

import type { CSSProperties } from 'react'
import type { HiddenLetterSceneData } from '../../_exam/types'
import styles from '../exam.module.css'

export default function HiddenLetterScene({ scene }: { scene: HiddenLetterSceneData }) {
  const crop = scene.container.visual.sprite
  if (!crop) return null
  const maxX = crop.sheetWidth - crop.width
  const maxY = crop.sheetHeight - crop.height
  const containerStyle = {
    left: `${scene.container.x}%`,
    top: `${scene.container.y}%`,
    width: `${scene.container.width}%`,
    height: `${scene.container.height}%`,
    zIndex: scene.container.zIndex,
    backgroundImage: `url(${crop.spriteSheet})`,
    backgroundSize: `${crop.sheetWidth / crop.width * 100}% ${crop.sheetHeight / crop.height * 100}%`,
    backgroundPosition: `${maxX > 0 ? crop.x / maxX * 100 : 0}% ${maxY > 0 ? crop.y / maxY * 100 : 0}%`,
  } satisfies CSSProperties

  return <div className={styles.hiddenLetterScene} role="group" aria-label="Hình chữ cái đang chơi trốn tìm">
    <span className={styles.hiddenLetterContainerImage} role="img" aria-label={scene.container.label} style={containerStyle} />
    {scene.letters.map(item => <span
      key={item.id}
      className={styles.hiddenLetterSceneItem}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        color: item.color,
        fontSize: `${item.size}px`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: item.zIndex,
      }}
    >{item.value}</span>)}
  </div>
}
