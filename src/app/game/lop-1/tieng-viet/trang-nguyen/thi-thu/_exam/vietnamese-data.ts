export type VietnameseTone = 'ngang' | 'sắc' | 'huyền' | 'hỏi' | 'ngã' | 'nặng'
export type WordCategory = 'animal' | 'object' | 'fruit' | 'flower' | 'vegetable' | 'root' | 'vehicle'

export type VietnameseWord = {
  id: string
  word: string
  category: WordCategory
  emoji: string
  initial: string
  rhyme: string
  tone: VietnameseTone
  letters: string[]
  audio?: string
  rank?: number
}

export const VIETNAMESE_ALPHABET = [
  'a', 'ă', 'â', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l', 'm', 'n',
  'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y',
] as const

export const TONE_NAMES: VietnameseTone[] = ['ngang', 'sắc', 'huyền', 'hỏi', 'ngã', 'nặng']

const voiceRoot = '/games/general/voices/tieng-viet'
const letterFile: Record<string, string> = {
  a: 'a', b: 'b', c: 'c', d: 'd', đ: 'dd', e: 'e', ê: 'ee', g: 'g', h: 'h', i: 'i',
  k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', ô: 'oo', ơ: 'ow', u: 'u', ư: 'uw',
}
export const letterVoice = (letter: string) => letterFile[letter.toLocaleLowerCase('vi-VN')]
  ? `${voiceRoot}/letters/${letterFile[letter.toLocaleLowerCase('vi-VN')]}.mp3`
  : undefined

export const toneVoice = (tone: VietnameseTone) => ({
  sắc: `${voiceRoot}/tones/dau-sac.mp3`,
  huyền: `${voiceRoot}/tones/dau-huyen.mp3`,
  hỏi: `${voiceRoot}/tones/dau-hoi.mp3`,
  ngã: `${voiceRoot}/tones/dau-nga.mp3`,
  nặng: `${voiceRoot}/tones/dau-nang.mp3`,
  ngang: undefined,
}[tone])

const words: VietnameseWord[] = [
  { id: 'fish', word: 'cá', category: 'animal', emoji: '🐟', initial: 'c', rhyme: 'a', tone: 'sắc', letters: ['c', 'a'], audio: `${voiceRoot}/syllables/ca-sac.mp3` },
  { id: 'dog', word: 'chó', category: 'animal', emoji: '🐶', initial: 'ch', rhyme: 'o', tone: 'sắc', letters: ['ch', 'o'] },
  { id: 'cat', word: 'mèo', category: 'animal', emoji: '🐱', initial: 'm', rhyme: 'eo', tone: 'huyền', letters: ['m', 'e', 'o'] },
  { id: 'rabbit', word: 'thỏ', category: 'animal', emoji: '🐰', initial: 'th', rhyme: 'o', tone: 'hỏi', letters: ['th', 'o'] },
  { id: 'cow', word: 'bò', category: 'animal', emoji: '🐄', initial: 'b', rhyme: 'o', tone: 'huyền', letters: ['b', 'o'], audio: `${voiceRoot}/syllables/bo-huyen.mp3` },
  { id: 'chicken', word: 'gà', category: 'animal', emoji: '🐔', initial: 'g', rhyme: 'a', tone: 'huyền', letters: ['g', 'a'], audio: `${voiceRoot}/syllables/ga-huyen.mp3` },
  { id: 'duck', word: 'vịt', category: 'animal', emoji: '🦆', initial: 'v', rhyme: 'it', tone: 'nặng', letters: ['v', 'i', 't'] },
  { id: 'goat', word: 'dê', category: 'animal', emoji: '🐐', initial: 'd', rhyme: 'ê', tone: 'ngang', letters: ['d', 'ê'] },
  { id: 'monkey', word: 'khỉ', category: 'animal', emoji: '🐒', initial: 'kh', rhyme: 'i', tone: 'hỏi', letters: ['kh', 'i'], audio: `${voiceRoot}/syllables/khi-hoi.mp3` },
  { id: 'tiger', word: 'hổ', category: 'animal', emoji: '🐯', initial: 'h', rhyme: 'ô', tone: 'hỏi', letters: ['h', 'ô'] },
  { id: 'horse', word: 'ngựa', category: 'animal', emoji: '🐴', initial: 'ng', rhyme: 'ưa', tone: 'nặng', letters: ['ng', 'ư', 'a'] },
  { id: 'elephant', word: 'voi', category: 'animal', emoji: '🐘', initial: 'v', rhyme: 'oi', tone: 'ngang', letters: ['v', 'o', 'i'] },

  { id: 'hat', word: 'mũ', category: 'object', emoji: '🧢', initial: 'm', rhyme: 'u', tone: 'ngã', letters: ['m', 'u'] },
  { id: 'shoe', word: 'giày', category: 'object', emoji: '👟', initial: 'gi', rhyme: 'ay', tone: 'huyền', letters: ['gi', 'a', 'y'] },
  { id: 'chair', word: 'ghế', category: 'object', emoji: '🪑', initial: 'gh', rhyme: 'ê', tone: 'sắc', letters: ['gh', 'ê'], audio: `${voiceRoot}/syllables/ghe-circ-sac.mp3` },
  { id: 'bicycle', word: 'xe đạp', category: 'vehicle', emoji: '🚲', initial: 'x', rhyme: 'ap', tone: 'nặng', letters: ['x', 'e', 'đ', 'a', 'p'], rank: 1 },
  { id: 'airplane', word: 'máy bay', category: 'vehicle', emoji: '✈️', initial: 'm', rhyme: 'ay', tone: 'sắc', letters: ['m', 'a', 'y', 'b', 'a', 'y'], rank: 4 },
  { id: 'cup', word: 'cốc', category: 'object', emoji: '🥤', initial: 'c', rhyme: 'ôc', tone: 'sắc', letters: ['c', 'ô', 'c'] },
  { id: 'table', word: 'bàn', category: 'object', emoji: '🪑', initial: 'b', rhyme: 'an', tone: 'huyền', letters: ['b', 'a', 'n'] },
  { id: 'cabinet', word: 'tủ', category: 'object', emoji: '🗄️', initial: 't', rhyme: 'u', tone: 'hỏi', letters: ['t', 'u'] },
  { id: 'spoon', word: 'thìa', category: 'object', emoji: '🥄', initial: 'th', rhyme: 'ia', tone: 'huyền', letters: ['th', 'i', 'a'] },
  { id: 'bowl', word: 'bát', category: 'object', emoji: '🥣', initial: 'b', rhyme: 'at', tone: 'sắc', letters: ['b', 'a', 't'] },
  { id: 'shirt', word: 'áo', category: 'object', emoji: '👕', initial: 'a', rhyme: 'ao', tone: 'sắc', letters: ['a', 'o'] },
  { id: 'book', word: 'sách', category: 'object', emoji: '📚', initial: 's', rhyme: 'ach', tone: 'sắc', letters: ['s', 'a', 'c', 'h'] },
  { id: 'pot', word: 'nồi', category: 'object', emoji: '🍲', initial: 'n', rhyme: 'ôi', tone: 'huyền', letters: ['n', 'ô', 'i'] },
  { id: 'scissors', word: 'kéo', category: 'object', emoji: '✂️', initial: 'k', rhyme: 'eo', tone: 'sắc', letters: ['k', 'e', 'o'] },
  { id: 'washing-machine', word: 'máy giặt', category: 'object', emoji: '🧺', initial: 'm', rhyme: 'ay', tone: 'sắc', letters: ['m', 'a', 'y', 'gi', 'a', 't'] },
  { id: 'bus', word: 'xe buýt', category: 'vehicle', emoji: '🚌', initial: 'x', rhyme: 'uyt', tone: 'sắc', letters: ['x', 'e', 'b', 'u', 'y', 't'], rank: 6 },
  { id: 'train', word: 'tàu hỏa', category: 'vehicle', emoji: '🚂', initial: 't', rhyme: 'oa', tone: 'hỏi', letters: ['t', 'a', 'u', 'h', 'o', 'a'], rank: 2 },
  { id: 'car', word: 'ô tô', category: 'vehicle', emoji: '🚗', initial: 'ô', rhyme: 'ô', tone: 'ngang', letters: ['ô', 't', 'ô'], rank: 3 },
  { id: 'motorbike', word: 'xe máy', category: 'vehicle', emoji: '🛵', initial: 'x', rhyme: 'ay', tone: 'sắc', letters: ['x', 'e', 'm', 'a', 'y'], rank: 5 },
  { id: 'boat', word: 'tàu thủy', category: 'vehicle', emoji: '🚤', initial: 't', rhyme: 'uy', tone: 'hỏi', letters: ['t', 'a', 'u', 'th', 'u', 'y'], rank: 7 },
  { id: 'cyclo', word: 'xích lô', category: 'vehicle', emoji: '🛺', initial: 'x', rhyme: 'ô', tone: 'ngã', letters: ['x', 'i', 'ch', 'l', 'ô'], rank: 8 },

  { id: 'pear', word: 'lê', category: 'fruit', emoji: '🍐', initial: 'l', rhyme: 'ê', tone: 'ngang', letters: ['l', 'ê'] },
  { id: 'apple', word: 'táo', category: 'fruit', emoji: '🍎', initial: 't', rhyme: 'ao', tone: 'sắc', letters: ['t', 'a', 'o'] },
  { id: 'orange', word: 'cam', category: 'fruit', emoji: '🍊', initial: 'c', rhyme: 'am', tone: 'ngang', letters: ['c', 'a', 'm'] },
  { id: 'banana', word: 'chuối', category: 'fruit', emoji: '🍌', initial: 'ch', rhyme: 'uôi', tone: 'sắc', letters: ['ch', 'u', 'ô', 'i'] },
  { id: 'jackfruit', word: 'mít', category: 'fruit', emoji: '🍈', initial: 'm', rhyme: 'it', tone: 'sắc', letters: ['m', 'i', 't'] },
  { id: 'custard-apple', word: 'na', category: 'fruit', emoji: '🍈', initial: 'n', rhyme: 'a', tone: 'ngang', letters: ['n', 'a'] },
  { id: 'grape', word: 'nho', category: 'fruit', emoji: '🍇', initial: 'nh', rhyme: 'o', tone: 'ngang', letters: ['nh', 'o'] },
  { id: 'papaya', word: 'đu đủ', category: 'fruit', emoji: '🥭', initial: 'đ', rhyme: 'u', tone: 'ngang', letters: ['đ', 'u', 'đ', 'u'] },
  { id: 'plum', word: 'mận', category: 'fruit', emoji: '🫐', initial: 'm', rhyme: 'ân', tone: 'nặng', letters: ['m', 'â', 'n'] },
  { id: 'mango', word: 'xoài', category: 'fruit', emoji: '🥭', initial: 'x', rhyme: 'oai', tone: 'huyền', letters: ['x', 'o', 'a', 'i'] },

  { id: 'rose', word: 'hoa hồng', category: 'flower', emoji: '🌹', initial: 'h', rhyme: 'ông', tone: 'huyền', letters: ['h', 'o', 'a', 'h', 'ô', 'n', 'g'] },
  { id: 'lotus', word: 'hoa sen', category: 'flower', emoji: '🪷', initial: 'h', rhyme: 'en', tone: 'ngang', letters: ['h', 'o', 'a', 's', 'e', 'n'] },
  { id: 'chrysanthemum', word: 'hoa cúc', category: 'flower', emoji: '🌼', initial: 'h', rhyme: 'uc', tone: 'sắc', letters: ['h', 'o', 'a', 'c', 'u', 'c'] },
  { id: 'apricot-blossom', word: 'hoa mai', category: 'flower', emoji: '🌼', initial: 'h', rhyme: 'ai', tone: 'ngang', letters: ['h', 'o', 'a', 'm', 'a', 'i'] },
  { id: 'peach-blossom', word: 'hoa đào', category: 'flower', emoji: '🌸', initial: 'h', rhyme: 'ao', tone: 'huyền', letters: ['h', 'o', 'a', 'đ', 'a', 'o'] },
  { id: 'orchid', word: 'hoa lan', category: 'flower', emoji: '🌺', initial: 'h', rhyme: 'an', tone: 'ngang', letters: ['h', 'o', 'a', 'l', 'a', 'n'] },
  { id: 'sunflower', word: 'hoa hướng dương', category: 'flower', emoji: '🌻', initial: 'h', rhyme: 'ương', tone: 'sắc', letters: ['h', 'o', 'a', 'h', 'ư', 'ơ', 'n', 'g', 'd', 'ư', 'ơ', 'n', 'g'] },
  { id: 'jasmine', word: 'hoa nhài', category: 'flower', emoji: '🌼', initial: 'h', rhyme: 'ai', tone: 'huyền', letters: ['h', 'o', 'a', 'n', 'h', 'a', 'i'] },

  { id: 'cabbage', word: 'bắp cải', category: 'vegetable', emoji: '🥬', initial: 'b', rhyme: 'ai', tone: 'hỏi', letters: ['b', 'ă', 'p', 'c', 'a', 'i'] },
  { id: 'water-spinach', word: 'rau muống', category: 'vegetable', emoji: '🥬', initial: 'r', rhyme: 'uông', tone: 'sắc', letters: ['r', 'a', 'u', 'm', 'u', 'ô', 'n', 'g'] },
  { id: 'mustard-green', word: 'rau cải', category: 'vegetable', emoji: '🥬', initial: 'r', rhyme: 'ai', tone: 'hỏi', letters: ['r', 'a', 'u', 'c', 'a', 'i'] },
  { id: 'amaranth', word: 'rau dền', category: 'vegetable', emoji: '🥬', initial: 'r', rhyme: 'ên', tone: 'huyền', letters: ['r', 'a', 'u', 'd', 'ê', 'n'] },
  { id: 'tomato', word: 'cà chua', category: 'vegetable', emoji: '🍅', initial: 'c', rhyme: 'a', tone: 'huyền', letters: ['c', 'a', 'c', 'h', 'u', 'a'] },
  { id: 'cucumber', word: 'dưa leo', category: 'vegetable', emoji: '🥒', initial: 'd', rhyme: 'ưa', tone: 'ngang', letters: ['d', 'ư', 'a', 'l', 'e', 'o'] },
  { id: 'pumpkin', word: 'bí đỏ', category: 'vegetable', emoji: '🎃', initial: 'b', rhyme: 'i', tone: 'sắc', letters: ['b', 'i', 'đ', 'o'] },
  { id: 'eggplant', word: 'cà tím', category: 'vegetable', emoji: '🍆', initial: 'c', rhyme: 'a', tone: 'huyền', letters: ['c', 'a', 't', 'i', 'm'] },
  { id: 'carrot', word: 'cà rốt', category: 'root', emoji: '🥕', initial: 'c', rhyme: 'ôt', tone: 'sắc', letters: ['c', 'a', 'r', 'ô', 't'] },
  { id: 'radish', word: 'củ cải', category: 'root', emoji: '🥕', initial: 'c', rhyme: 'ai', tone: 'hỏi', letters: ['c', 'u', 'c', 'a', 'i'] },
  { id: 'ginger', word: 'gừng', category: 'root', emoji: '🫚', initial: 'g', rhyme: 'ưng', tone: 'huyền', letters: ['g', 'ư', 'n', 'g'] },
  { id: 'sweet-potato', word: 'khoai lang', category: 'root', emoji: '🍠', initial: 'kh', rhyme: 'ang', tone: 'ngang', letters: ['kh', 'o', 'a', 'i', 'l', 'a', 'n', 'g'] },
  { id: 'beet', word: 'củ dền', category: 'root', emoji: '🫜', initial: 'c', rhyme: 'ên', tone: 'huyền', letters: ['c', 'u', 'd', 'ê', 'n'] },
  { id: 'taro', word: 'khoai môn', category: 'root', emoji: '🍠', initial: 'kh', rhyme: 'ôn', tone: 'ngang', letters: ['kh', 'o', 'a', 'i', 'm', 'ô', 'n'] },
]

export const WORD_BANK = words
export const ANIMALS = words.filter(word => word.category === 'animal')
export const OBJECTS = words.filter(word => word.category === 'object')
export const FRUITS = words.filter(word => word.category === 'fruit')
export const FLOWERS = words.filter(word => word.category === 'flower')
export const VEGETABLES = words.filter(word => word.category === 'vegetable')
export const ROOTS = words.filter(word => word.category === 'root')
export const VEHICLES = words.filter(word => word.category === 'vehicle')

export const AVAILABLE_WORD_VOICES: Record<string, string> = {
  'cá': `${voiceRoot}/syllables/ca-sac.mp3`, 'bò': `${voiceRoot}/syllables/bo-huyen.mp3`,
  'gà': `${voiceRoot}/syllables/ga-huyen.mp3`, 'khỉ': `${voiceRoot}/syllables/khi-hoi.mp3`,
  'ghế': `${voiceRoot}/syllables/ghe-circ-sac.mp3`, 'đồ gỗ': `${voiceRoot}/words/do-go.mp3`,
  'ghế gỗ': `${voiceRoot}/words/ghe-go.mp3`, 'nhà ga': `${voiceRoot}/words/nha-ga.mp3`,
  'cô bé': `${voiceRoot}/words/co-be.mp3`, 'đu đủ': `${voiceRoot}/words/du-du.mp3`,
  'lê': `${voiceRoot}/syllables/le.mp3`,
}
