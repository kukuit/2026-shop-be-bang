import type Phaser from 'phaser'
import type { GameImage, GameImages } from './game-image'

export function preloadGameImages(scene: Phaser.Scene, images?: GameImages) {
  const sources = new Set<string>()
  Object.values(images ?? {}).forEach(({ src }) => {
    if (sources.has(src) || scene.textures.exists(src)) return
    sources.add(src)
    scene.load.image(src, src)
  })
}

export function createGameImage(scene: Phaser.Scene, image: GameImage | undefined, x: number, y: number, width: number, height: number) {
  if (!image || !scene.textures.exists(image.src)) return undefined
  const texture = scene.textures.get(image.src)
  const frame = image.frame
  if (!texture.has(image.key)) texture.add(image.key, 0, frame.x, frame.y, frame.width, frame.height)
  const captionHeight = image.caption ? height * 0.28 : 0
  const scale = Math.min(width / frame.width, (height - captionHeight) / frame.height)
  if (!image.caption) return scene.add.image(x, y, image.src, image.key).setScale(scale)
  const picture = scene.add.image(0, -captionHeight / 2, image.src, image.key).setScale(scale)
  const caption = scene.add.text(0, height / 2 - captionHeight / 2, image.caption, {
    fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: `${Math.round(captionHeight * 0.85)}px`,
    color: '#16345c', backgroundColor: '#ffffff', padding: { x: 3, y: 0 },
  }).setOrigin(0.5)
  caption.setScale(Math.min(1, width / caption.width, captionHeight / caption.height))
  return scene.add.container(x, y, [picture, caption]).setSize(width, height)
}
