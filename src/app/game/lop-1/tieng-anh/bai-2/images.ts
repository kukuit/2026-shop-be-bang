import type { GameImages } from '@/components/games/general/game-image'
import { TIENG_ANH_1_BAI_1_IMAGES } from '../bai-1/images'

const atlas = { src: '/games/lessons/lop-1/tieng-anh/bai-2/images/optimize/vocabulary.png', sourceWidth: 1254, sourceHeight: 1254 }
export const TIENG_ANH_1_BAI_2_IMAGES: GameImages = {
  '🐱': { ...atlas, key: 'cat', alt: 'cat', frame: { x: 0, y: 0, width: 627, height: 627 } },
  '🚗': { ...atlas, key: 'car', alt: 'car', frame: { x: 627, y: 0, width: 627, height: 627 } },
  '☕': { ...atlas, key: 'cup', alt: 'cup', frame: { x: 0, y: 627, width: 627, height: 627 } },
  '🧁': { ...atlas, key: 'cake', alt: 'cake', frame: { x: 627, y: 627, width: 627, height: 627 } },
  '⚽': TIENG_ANH_1_BAI_1_IMAGES['⚽'],
  '🚲': TIENG_ANH_1_BAI_1_IMAGES['🚲'],
  '📘': TIENG_ANH_1_BAI_1_IMAGES['📘'],
}
