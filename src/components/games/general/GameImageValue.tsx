'use client'

import { createContext, useContext } from 'react'
import type { GameImages } from './game-image'
import GameImageView from './GameImageView'

const ImageContext = createContext<GameImages | undefined>(undefined)
export const GameImagesProvider = ImageContext.Provider

export default function GameImageValue({ value, size = 38 }: { value: string | number; size?: number }) {
  const image = useContext(ImageContext)?.[String(value)]
  if (!image) return <>{value}</>
  return <span style={{ display: 'inline-block', width: size, height: size, maxWidth: '100%', verticalAlign: 'middle' }}><GameImageView image={image} /></span>
}
