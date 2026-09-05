import { useId } from 'react'
import type { GameImage } from './game-image'

export default function GameImageView({ image, className = '' }: { image: GameImage; className?: string }) {
  const { x, y, width, height } = image.frame
  const clipId = useId()
  return (
    <span className={`pointer-events-none flex h-full w-full flex-col items-center ${className}`}>
    <svg role="img" aria-label={image.alt} viewBox={`${x} ${y} ${width} ${height}`} className="block min-h-0 w-full flex-1" preserveAspectRatio="xMidYMid meet">
      <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
      <image href={image.src} width={image.sourceWidth} height={image.sourceHeight} clipPath={`url(#${clipId})`} />
    </svg>
    {image.caption && <span style={{ height: '28%', fontSize: '10px', lineHeight: 1, fontWeight: 900, background: 'white', color: '#16345c', borderRadius: 3, paddingInline: 3 }}>{image.caption}</span>}
    </span>
  )
}
