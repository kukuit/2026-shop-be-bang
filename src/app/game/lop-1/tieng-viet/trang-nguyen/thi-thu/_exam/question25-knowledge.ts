import fruitManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/fruit.manifest.json'
import objectNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/object-name.manifest.json'
import tagNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/tag-name.manifest.json'
import flowerNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/flower-name.manifest.json'
import type { ExamSpriteCrop, ExamVisual, Question25Category, Question25ManifestId, Question25WordKnowledgeItem } from './types'

type Question25Manifest = {
  image: string
  width: number
  height: number
  items: Array<{ id: string; x: number; y: number; width: number; height: number }>
}

export const QUESTION_25_CATEGORY_META: Record<Question25Category, { label: string; manifestId: Question25ManifestId }> = {
  fruit: { label: 'quả', manifestId: 'fruit' },
  object: { label: 'đồ vật', manifestId: 'object' },
  animal: { label: 'con vật', manifestId: 'animal' },
  flower: { label: 'hoa', manifestId: 'flower' },
}

export const QUESTION_25_ENABLED_CATEGORIES: readonly Question25Category[] = ['fruit', 'object', 'animal']

export const QUESTION_25_PROMPT = 'Chọn đáp án thích hợp điền vào chỗ trống.'

/**
 * Linguistic fields are curated explicitly. Rhyme and tone are omitted for
 * multi-syllable names so the generator only asks properties with one clear answer.
 * `letters` stores base Vietnamese graphemes without tone marks, while retaining
 * the distinct letters ă, â, ê, ô, ơ and ư.
 */
export const QUESTION_25_WORDS: readonly Question25WordKnowledgeItem[] = [
  { id: 'tao', category: 'fruit', word: 'táo', imageId: 'tao', manifestId: 'fruit', initial: 't', rhyme: 'ao', tone: 'sắc', letters: ['t', 'a', 'o'] },
  { id: 'cam', category: 'fruit', word: 'cam', imageId: 'cam', manifestId: 'fruit', initial: 'c', rhyme: 'am', tone: 'ngang', letters: ['c', 'a', 'm'] },
  { id: 'chuoi', category: 'fruit', word: 'chuối', imageId: 'chuoi', manifestId: 'fruit', initial: 'ch', rhyme: 'uôi', tone: 'sắc', letters: ['c', 'h', 'u', 'ô', 'i'] },
  { id: 'dua-hau', category: 'fruit', word: 'dưa hấu', imageId: 'dua-hau', manifestId: 'fruit', initial: 'd', letters: ['d', 'ư', 'a', 'h', 'â', 'u'] },
  { id: 'xoai', category: 'fruit', word: 'xoài', imageId: 'xoai', manifestId: 'fruit', initial: 'x', rhyme: 'oai', tone: 'huyền', letters: ['x', 'o', 'a', 'i'] },
  { id: 'nho', category: 'fruit', word: 'nho', imageId: 'nho', manifestId: 'fruit', initial: 'nh', rhyme: 'o', tone: 'ngang', letters: ['n', 'h', 'o'] },
  { id: 'dua', category: 'fruit', word: 'dứa', imageId: 'dua', manifestId: 'fruit', initial: 'd', rhyme: 'ưa', tone: 'sắc', letters: ['d', 'ư', 'a'] },
  { id: 'le', category: 'fruit', word: 'lê', imageId: 'le', manifestId: 'fruit', initial: 'l', rhyme: 'ê', tone: 'ngang', letters: ['l', 'ê'] },

  { id: 'mu', category: 'object', word: 'mũ', imageId: 'mu', manifestId: 'object', initial: 'm', rhyme: 'u', tone: 'ngã', letters: ['m', 'u'] },
  { id: 'khan', category: 'object', word: 'khăn', imageId: 'khan', manifestId: 'object', initial: 'kh', rhyme: 'ăn', tone: 'ngang', letters: ['k', 'h', 'ă', 'n'] },
  { id: 'dep', category: 'object', word: 'dép', imageId: 'dep', manifestId: 'object', initial: 'd', rhyme: 'ep', tone: 'sắc', letters: ['d', 'e', 'p'] },
  { id: 'tat', category: 'object', word: 'tất', imageId: 'tat', manifestId: 'object', initial: 't', rhyme: 'ât', tone: 'sắc', letters: ['t', 'â', 't'] },
  { id: 'ba-lo', category: 'object', word: 'ba lô', imageId: 'ba-lo', manifestId: 'object', initial: 'b', letters: ['b', 'a', 'l', 'ô'] },
  { id: 'but-chi', category: 'object', word: 'bút chì', imageId: 'but-chi', manifestId: 'object', initial: 'b', letters: ['b', 'u', 't', 'c', 'h', 'i'] },
  { id: 'tay', category: 'object', word: 'tẩy', imageId: 'tay', manifestId: 'object', initial: 't', rhyme: 'ay', tone: 'hỏi', letters: ['t', 'â', 'y'] },
  { id: 'thuoc', category: 'object', word: 'thước', imageId: 'thuoc', manifestId: 'object', initial: 'th', rhyme: 'ươc', tone: 'sắc', letters: ['t', 'h', 'ư', 'ơ', 'c'] },
  { id: 'vo', category: 'object', word: 'vở', imageId: 'vo', manifestId: 'object', initial: 'v', rhyme: 'ơ', tone: 'hỏi', letters: ['v', 'ơ'] },
  { id: 'sach', category: 'object', word: 'sách', imageId: 'sach', manifestId: 'object', initial: 's', rhyme: 'ach', tone: 'sắc', letters: ['s', 'a', 'c', 'h'] },
  { id: 'cap', category: 'object', word: 'cặp', imageId: 'cap', manifestId: 'object', initial: 'c', rhyme: 'ăp', tone: 'nặng', letters: ['c', 'ă', 'p'] },
  { id: 'binh-nuoc', category: 'object', word: 'bình nước', imageId: 'binh-nuoc', manifestId: 'object', initial: 'b', letters: ['b', 'i', 'n', 'h', 'ư', 'ơ', 'c'] },
  { id: 'o', category: 'object', word: 'ô', imageId: 'o', manifestId: 'object', initial: 'ô', rhyme: 'ô', tone: 'ngang', letters: ['ô'] },
  { id: 'bong', category: 'object', word: 'bóng', imageId: 'bong', manifestId: 'object', initial: 'b', rhyme: 'ong', tone: 'sắc', letters: ['b', 'o', 'n', 'g'] },
  { id: 'o-to', category: 'object', word: 'ô tô', imageId: 'o-to', manifestId: 'object', initial: 'ô', letters: ['ô', 't', 'o'] },
  { id: 'gau-bong', category: 'object', word: 'gấu bông', imageId: 'gau-bong', manifestId: 'object', initial: 'g', letters: ['g', 'â', 'u', 'b', 'o', 'n'] },
  { id: 'dong-ho', category: 'object', word: 'đồng hồ', imageId: 'dong-ho', manifestId: 'object', initial: 'đ', letters: ['đ', 'o', 'n', 'g', 'h'] },
  { id: 'den', category: 'object', word: 'đèn', imageId: 'den', manifestId: 'object', initial: 'đ', rhyme: 'en', tone: 'huyền', letters: ['đ', 'e', 'n'] },
  { id: 'keo', category: 'object', word: 'kéo', imageId: 'keo', manifestId: 'object', initial: 'k', rhyme: 'eo', tone: 'sắc', letters: ['k', 'e', 'o'] },
  { id: 'luoc', category: 'object', word: 'lược', imageId: 'luoc', manifestId: 'object', initial: 'l', rhyme: 'ươc', tone: 'nặng', letters: ['l', 'ư', 'ơ', 'c'] },
  { id: 'ban-chai-danh-rang', category: 'object', word: 'bàn chải đánh răng', imageId: 'ban-chai-danh-rang', manifestId: 'object', initial: 'b', letters: ['b', 'a', 'n', 'c', 'h', 'i', 'đ', 'g', 'r', 'ă'] },
  { id: 'xa-phong', category: 'object', word: 'xà phòng', imageId: 'xa-phong', manifestId: 'object', initial: 'x', letters: ['x', 'a', 'p', 'h', 'o', 'n', 'g'] },
  { id: 'coc', category: 'object', word: 'cốc', imageId: 'coc', manifestId: 'object', initial: 'c', rhyme: 'ôc', tone: 'sắc', letters: ['c', 'ô', 'c'] },
  { id: 'thia', category: 'object', word: 'thìa', imageId: 'thia', manifestId: 'object', initial: 'th', rhyme: 'ia', tone: 'huyền', letters: ['t', 'h', 'i', 'a'] },
  { id: 'ghe', category: 'object', word: 'ghế', imageId: 'ghe', manifestId: 'object', initial: 'gh', rhyme: 'ê', tone: 'sắc', letters: ['g', 'h', 'ê'] },
  { id: 'chia-khoa', category: 'object', word: 'chìa khóa', imageId: 'chia-khoa', manifestId: 'object', initial: 'ch', letters: ['c', 'h', 'i', 'a', 'k', 'h', 'o'] },
  { id: 'dieu', category: 'object', word: 'diều', imageId: 'dieu', manifestId: 'object', initial: 'd', rhyme: 'iêu', tone: 'huyền', letters: ['d', 'i', 'ê', 'u'] },

  { id: 'a', category: 'animal', word: 'cá', imageId: 'a', manifestId: 'animal', initial: 'c', rhyme: 'a', tone: 'sắc', letters: ['c', 'a'] },
  { id: 'b', category: 'animal', word: 'bò', imageId: 'b', manifestId: 'animal', initial: 'b', rhyme: 'o', tone: 'huyền', letters: ['b', 'o'] },
  { id: 'c', category: 'animal', word: 'cò', imageId: 'c', manifestId: 'animal', initial: 'c', rhyme: 'o', tone: 'huyền', letters: ['c', 'o'] },
  { id: 'd', category: 'animal', word: 'dơi', imageId: 'd', manifestId: 'animal', initial: 'd', rhyme: 'ơi', tone: 'ngang', letters: ['d', 'ơ', 'i'] },
  { id: 'dd', category: 'animal', word: 'đà điểu', imageId: 'dd', manifestId: 'animal', initial: 'đ', letters: ['đ', 'a', 'd', 'i', 'ê', 'u'] },
  { id: 'e', category: 'animal', word: 've', imageId: 'e', manifestId: 'animal', initial: 'v', rhyme: 'e', tone: 'ngang', letters: ['v', 'e'] },
  { id: 'ee', category: 'animal', word: 'dê', imageId: 'ee', manifestId: 'animal', initial: 'd', rhyme: 'ê', tone: 'ngang', letters: ['d', 'ê'] },
  { id: 'g', category: 'animal', word: 'gà', imageId: 'g', manifestId: 'animal', initial: 'g', rhyme: 'a', tone: 'huyền', letters: ['g', 'a'] },
  { id: 'h', category: 'animal', word: 'hổ', imageId: 'h', manifestId: 'animal', initial: 'h', rhyme: 'ô', tone: 'hỏi', letters: ['h', 'ô'] },
  { id: 'i', category: 'animal', word: 'chim', imageId: 'i', manifestId: 'animal', initial: 'ch', rhyme: 'im', tone: 'ngang', letters: ['c', 'h', 'i', 'm'] },
  { id: 'k', category: 'animal', word: 'kỳ đà', imageId: 'k', manifestId: 'animal', initial: 'k', letters: ['k', 'y', 'đ', 'a'] },
  { id: 'l', category: 'animal', word: 'lợn', imageId: 'l', manifestId: 'animal', initial: 'l', rhyme: 'ơn', tone: 'nặng', letters: ['l', 'ơ', 'n'] },
  { id: 'm', category: 'animal', word: 'mèo', imageId: 'm', manifestId: 'animal', initial: 'm', rhyme: 'eo', tone: 'huyền', letters: ['m', 'e', 'o'] },
  { id: 'n', category: 'animal', word: 'nai', imageId: 'n', manifestId: 'animal', initial: 'n', rhyme: 'ai', tone: 'ngang', letters: ['n', 'a', 'i'] },
  { id: 'o', category: 'animal', word: 'ong', imageId: 'o', manifestId: 'animal', initial: 'o', rhyme: 'ong', tone: 'ngang', letters: ['o', 'n', 'g'] },
  { id: 'oo', category: 'animal', word: 'ốc', imageId: 'oo', manifestId: 'animal', initial: 'ô', rhyme: 'ôc', tone: 'sắc', letters: ['ô', 'c'] },
  { id: 'ow', category: 'animal', word: 'hươu', imageId: 'ow', manifestId: 'animal', initial: 'h', rhyme: 'ươu', tone: 'ngang', letters: ['h', 'ư', 'ơ', 'u'] },
  { id: 'p', category: 'animal', word: 'bọ cạp', imageId: 'p', manifestId: 'animal', initial: 'b', letters: ['b', 'o', 'c', 'a', 'p'] },
  { id: 'q', category: 'animal', word: 'quạ', imageId: 'q', manifestId: 'animal', initial: 'qu', rhyme: 'a', tone: 'nặng', letters: ['q', 'u', 'a'] },
  { id: 'r', category: 'animal', word: 'rùa', imageId: 'r', manifestId: 'animal', initial: 'r', rhyme: 'ua', tone: 'huyền', letters: ['r', 'u', 'a'] },
  { id: 's', category: 'animal', word: 'sóc', imageId: 's', manifestId: 'animal', initial: 's', rhyme: 'oc', tone: 'sắc', letters: ['s', 'o', 'c'] },
  { id: 't', category: 'animal', word: 'thỏ', imageId: 't', manifestId: 'animal', initial: 'th', rhyme: 'o', tone: 'hỏi', letters: ['t', 'h', 'o'] },
  { id: 'u', category: 'animal', word: 'cú', imageId: 'u', manifestId: 'animal', initial: 'c', rhyme: 'u', tone: 'sắc', letters: ['c', 'u'] },
  { id: 'uw', category: 'animal', word: 'sư tử', imageId: 'uw', manifestId: 'animal', initial: 's', letters: ['s', 'ư', 't', 'u'] },
  { id: 'v', category: 'animal', word: 'voi', imageId: 'v', manifestId: 'animal', initial: 'v', rhyme: 'oi', tone: 'ngang', letters: ['v', 'o', 'i'] },
  { id: 'x', category: 'animal', word: 'xén tóc', imageId: 'x', manifestId: 'animal', initial: 'x', letters: ['x', 'e', 'n', 't', 'o', 'c'] },
  { id: 'y', category: 'animal', word: 'yến', imageId: 'y', manifestId: 'animal', initial: 'y', rhyme: 'ên', tone: 'sắc', letters: ['y', 'ê', 'n'] },
]

const QUESTION_25_MANIFESTS: Record<Question25ManifestId, Question25Manifest> = {
  fruit: fruitManifest,
  object: objectNameManifest,
  animal: tagNameManifest,
  flower: flowerNameManifest,
}

export function getQuestion25Sprite(manifestId: Question25ManifestId, imageId: string): ExamSpriteCrop | undefined {
  const manifest = QUESTION_25_MANIFESTS[manifestId]
  const item = manifest.items.find(candidate => candidate.id === imageId)
  if (!item || manifest.width <= 0 || manifest.height <= 0) return undefined
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

export function getQuestion25Visual(item: Question25WordKnowledgeItem): ExamVisual | undefined {
  const sprite = getQuestion25Sprite(item.manifestId, item.imageId)
  const manifest = QUESTION_25_MANIFESTS[item.manifestId]
  if (!sprite) return undefined
  return { type: 'image', value: manifest.image, label: item.word, sprite }
}
