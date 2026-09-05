import type { GameImages } from '@/components/games/general/game-image'

const atlas = { src: '/games/lessons/lop-1/tieng-anh/bai-1/images/vocabulary.png', sourceWidth: 1298, sourceHeight: 1212 }

// Exact transparent sprite bounds in the generated atlas; text answers remain text.
const vocabulary: GameImages = {
  '👦': { ...atlas, key: 'bill', alt: 'Bill', frame: { x: 81, y: 13, width: 571, height: 608 } },
  '⚽': { ...atlas, key: 'ball', alt: 'ball', frame: { x: 782, y: 141, width: 435, height: 435 } },
  '🚲': { ...atlas, key: 'bike', alt: 'bike', frame: { x: 20, y: 670, width: 643, height: 472 } },
  '📘': { ...atlas, key: 'book', alt: 'book', frame: { x: 716, y: 720, width: 555, height: 400 } },
}

export const TIENG_ANH_1_BAI_1_IMAGES: GameImages = {
  ...vocabulary,
  '👋🙂': { ...vocabulary['👦'], alt: 'Bill says Hi!', caption: 'Hi!' },
  '🙂👋': { ...vocabulary['👦'], alt: 'Bill says Bye!', caption: 'Bye!' },
  '📚🙂': vocabulary['📘'],
  '🚲🙂': vocabulary['🚲'],
}
