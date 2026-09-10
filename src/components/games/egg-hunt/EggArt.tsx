'use client'

import { useId } from 'react'
import type { EggStyle } from './board'

const PALETTE: Record<EggStyle, [string, string, string]> = {
  green: ['#75dc48', '#16b43f', '#087c38'],
  pink: ['#ff85ca', '#ed38a4', '#ae1c7d'],
  orange: ['#ffce36', '#ff9921', '#e74622'],
  blue: ['#77e0f7', '#24bce7', '#167ab3'],
  striped: ['#ff8bd4', '#eb4bb6', '#b12492'],
}
const OUTLINE = 'M0 -13 C-6 -13 -11 -2 -11 4 C-11 17 11 17 11 4 C11 -2 6 -13 0 -13Z'

function Flower({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`} fill="#ffe343">
    {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cy="-2" rx="1.35" ry="2" transform={`rotate(${angle})`} />)}
    <circle r="1.05" fill="#eea520" />
  </g>
}

export default function EggArt({ color }: { color: EggStyle }) {
  const id = useId().replace(/:/g, '')
  const [light, base, dark] = PALETTE[color]
  return <g aria-hidden="true" transform="scale(0.9)">
    <defs>
      <radialGradient id={`${id}-color`} cx="32%" cy="24%" r="80%">
        <stop stopColor={light} /><stop offset=".58" stopColor={base} /><stop offset="1" stopColor={dark} />
      </radialGradient>
      <clipPath id={`${id}-clip`}><path d={OUTLINE} /></clipPath>
    </defs>
    <path d={OUTLINE} fill={`url(#${id}-color)`} stroke={dark} strokeWidth=".65" />
    <g clipPath={`url(#${id}-clip)`}>
      {color === 'green' && <>
        <path d="M-12 -7 Q-8 -10 -4 -7 T4 -7 T12 -7 M-13 4 Q-9 1 -5 4 T3 4 T11 4" fill="none" stroke="#ffdf30" strokeWidth="4" />
        <g fill="#fff15a"><circle cx="-6" cy="-1" r="1.1" /><circle cx="1" cy="0" r="1.15" /><circle cx="7" cy="-1" r="1" /><circle cx="-5" cy="10" r="1" /><circle cx="3" cy="10" r="1.2" /></g>
      </>}
      {color === 'pink' && <>
        <path d="M-11 -5 L-8 -9 L-5 -3 L-2 -8 L1 -2 L4 -7 L7 -1 L10 -6 M-12 7 L-8 3 L-5 9 L-2 4 L1 10 L4 5 L7 11 L11 6" fill="none" stroke="#ffe52e" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />
        <g fill="#ffe52e"><ellipse cx="-3" cy="0" rx=".8" ry="1.5" /><ellipse cx="4" cy="1" rx=".8" ry="1.4" /><circle cy="-11" r="1" /></g>
      </>}
      {color === 'orange' && <>
        <path d="M-12 -6 Q-8 -11 -4 -6 T4 -6 T12 -6 M-12 7 Q-8 2 -4 7 T4 7 T12 7" fill="none" stroke="#fff02d" strokeWidth="3.5" />
        <g fill="#e95327"><circle cx="-5" cy="0" r="1.8" /><circle cx="5" cy="1" r="1.8" /><circle cy="11" r="1.6" /></g>
      </>}
      {color === 'blue' && <>
        <Flower x={-5} y={-4} size={.8} /><Flower x={5} y={-5} size={.9} />
        <Flower x={1} y={7} /><Flower x={-9} y={5} size={.7} /><Flower x={8} y={11} size={.7} />
      </>}
      {color === 'striped' && <g transform="rotate(22)">
        <path d="M-15 -8 Q0 -3 15 -8 M-15 3 Q0 8 15 3 M-15 13 Q0 18 15 13" fill="none" stroke="#2bd8d6" strokeWidth="3.3" />
        <g fill="#ffe544"><ellipse cx="-4" cy="-10" rx="1.5" ry="2" /><ellipse cx="4" cy="-1" rx="1.4" ry="1.7" /><ellipse cx="-5" cy="8" rx="1.4" ry="1.8" /><ellipse cx="7" cy="10" rx="1.2" ry="1.5" /></g>
      </g>}
    </g>
    <path d="M-4 -10 Q-7 -7 -7 -4" fill="none" stroke="white" strokeWidth="1.5" opacity=".4" strokeLinecap="round" />
  </g>
}
