export type GameImage = {
  src: string
  sourceWidth: number
  sourceHeight: number
  key: string
  alt: string
  caption?: string
  frame: { x: number; y: number; width: number; height: number }
}

export type GameImages = Readonly<Record<string, GameImage>>
