import vegetableManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/vegetable.manifest.json'
import tuberManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/tuber.manifest.json'
import fruitManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/fruit.manifest.json'
import tagNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/tag-name.manifest.json'
import flowerNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/flower-name.manifest.json'
import type { ClassificationManifestId, ExamSpriteCrop } from './types'

type ManifestItem = { id: string; x: number; y: number; width: number; height: number }
type ClassificationManifest = {
  image: string
  width: number
  height: number
  items: ManifestItem[]
}

export const CLASSIFICATION_MANIFEST_REGISTRY: Record<ClassificationManifestId, ClassificationManifest> = {
  vegetable: vegetableManifest,
  tuber: tuberManifest,
  fruit: fruitManifest,
  animal: tagNameManifest,
  flower: flowerNameManifest,
}

export function getClassificationSprite(manifestId: ClassificationManifestId, imageId: string): ExamSpriteCrop | undefined {
  const manifest = CLASSIFICATION_MANIFEST_REGISTRY[manifestId]
  const item = manifest.items.find(candidate => candidate.id === imageId)
  if (!item || !manifest.width || !manifest.height) return undefined
  return {
    spriteSheet: manifest.image,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    sheetWidth: manifest.width,
    sheetHeight: manifest.height,
  }
}
