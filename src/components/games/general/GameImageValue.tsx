'use client'

import { createContext, useContext } from 'react'
import type { GameImages } from './game-image'
import GameImageView from './GameImageView'

const ImageContext = createContext<GameImages | undefined>(undefined)
export const GameImagesProvider = ImageContext.Provider

export default function GameImageValue({ value, size = 38, colorful = false }: { value: string | number; size?: number; colorful?: boolean }) {
  const image = useContext(ImageContext)?.[String(value)]
  if (!image) {
    if (!colorful) return <>{value}</>
    const colors = ['#2563eb', '#22c55e', '#a855f7', '#f59e0b', '#0891b2']
    return <>{String(value).normalize('NFC').split(/(\s+)/).map((word, index) =>
      /^\s+$/.test(word) ? word : <span key={index} style={{ color: word === '?' ? '#ef2f36' : colors[Math.floor(index / 2) % colors.length] }}>{word}</span>)}</>
  }
  return <span style={{ display: 'inline-block', width: size, height: size, maxWidth: '100%', verticalAlign: 'middle' }}><GameImageView image={image} /></span>
}
