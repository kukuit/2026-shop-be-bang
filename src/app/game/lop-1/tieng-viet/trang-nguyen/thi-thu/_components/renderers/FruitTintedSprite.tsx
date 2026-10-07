'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from '../exam.module.css'

type FruitManifestItem = {
  id: string
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

type FruitManifest = {
  width: number
  height: number
  grid: { columns: number; rows: number }
  items: readonly FruitManifestItem[]
}

type FruitTintedSpriteProps = {
  image: string
  imageId: string
  color: string
  manifest: FruitManifest
  label: string
  size?: number
}

const MAX_CACHED_FRUIT_VARIANTS = 12
const fruitTintCache = new Map<string, ImageData>()

function parseHexColor(hex: string): readonly [number, number, number] | undefined {
  const match = /^#([\da-f]{6})$/i.exec(hex)
  if (!match) return undefined
  const value = Number.parseInt(match[1], 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function getCachedTint(key: string): ImageData | undefined {
  const cached = fruitTintCache.get(key)
  if (!cached) return undefined
  fruitTintCache.delete(key)
  fruitTintCache.set(key, cached)
  return cached
}

function cacheTint(key: string, imageData: ImageData) {
  fruitTintCache.delete(key)
  fruitTintCache.set(key, imageData)
  while (fruitTintCache.size > MAX_CACHED_FRUIT_VARIANTS) {
    const oldestKey = fruitTintCache.keys().next().value
    if (oldestKey === undefined) return
    fruitTintCache.delete(oldestKey)
  }
}

function recolorGrayscale(imageData: ImageData, color: readonly [number, number, number]) {
  const pixels = imageData.data
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue

    const luminance = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722
    const shade = luminance / 255
    // The source sprite is intentionally grayscale. Keep its bright texture,
    // but limit the white blend so the tinted fruit does not wash out.
    const highlight = Math.max(0, Math.min(0.12, ((luminance - 242) / 13) * 0.12))
    for (let channel = 0; channel < 3; channel += 1) {
      const tintedShade = color[channel] * shade
      pixels[index + channel] = Math.round(tintedShade + (255 - tintedShade) * highlight)
    }
  }
}

export default function FruitTintedSprite({
  image,
  imageId,
  color,
  manifest,
  label,
  size = 120,
}: FruitTintedSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const source = manifest.items.find(item => item.id === imageId)
  const displayScale = source ? size / Math.max(source.width, source.height) : 1
  const displayWidth = source ? source.width * displayScale : size
  const displayHeight = source ? source.height * displayScale : size
  const rgb = useMemo(() => parseHexColor(color), [color])

  useEffect(() => {
    let disposed = false
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    setReady(false)
    if (!canvas || !context || !source || !rgb) {
      console.warn('Fruit tint failed', imageId, color)
      return () => { disposed = true }
    }

    canvas.width = source.width
    canvas.height = source.height
    const cacheKey = `${image}:${imageId}:${color.toLowerCase()}`
    const cachedImage = getCachedTint(cacheKey)
    if (cachedImage) {
      context.putImageData(cachedImage, 0, 0)
      setReady(true)
      return () => { disposed = true }
    }

    const sourceImage = new Image()
    sourceImage.onload = () => {
      if (disposed) return
      try {
        context.clearRect(0, 0, source.width, source.height)
        context.drawImage(
          sourceImage,
          source.x,
          source.y,
          source.width,
          source.height,
          0,
          0,
          source.width,
          source.height,
        )
        const imageData = context.getImageData(0, 0, source.width, source.height)
        recolorGrayscale(imageData, rgb)
        context.putImageData(imageData, 0, 0)
        cacheTint(cacheKey, imageData)
        setReady(true)
      } catch (error) {
        console.warn('Fruit tint failed', imageId, color, error)
      }
    }
    sourceImage.onerror = () => {
      if (disposed) return
      console.warn('Fruit tint failed', imageId, color)
    }
    sourceImage.src = image

    return () => {
      disposed = true
      sourceImage.onload = null
      sourceImage.onerror = null
    }
  }, [color, image, imageId, rgb, source])

  if (!source) return null

  const sizeStyle = { width: displayWidth, height: displayHeight }
  const maxHorizontalOffset = Math.max(1, manifest.width - source.width)
  const maxVerticalOffset = Math.max(1, manifest.height - source.height)
  return <span className={styles.question30FruitSpriteStage} role="img" aria-label={label} style={sizeStyle}>
    <span
      className={styles.question30FruitTintFallback}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: `${manifest.width / source.width * 100}% ${manifest.height / source.height * 100}%`,
        backgroundPosition: `${source.x / maxHorizontalOffset * 100}% ${source.y / maxVerticalOffset * 100}%`,
      }}
    />
    <canvas
      ref={canvasRef}
      className={`${styles.question30FruitTintedSprite} ${ready ? styles.question30FruitTintedSpriteReady : ''}`}
      aria-hidden="true"
    />
  </span>
}
