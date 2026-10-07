import type { CommonSoundWordItem } from './types'

const voiceRoot = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices'

const animal = (imageId: string, word: string, initial: string, voiceFile: string): CommonSoundWordItem => ({
  id: `animal-${imageId}`, word, initial, category: 'animal',
  voice: `${voiceRoot}/animals/${voiceFile}`, imageId, manifestId: 'animal',
})

const object = (imageId: string, word: string, initial: string, voiceFile: string): CommonSoundWordItem => ({
  id: `object-${imageId}`, word, initial, category: 'object',
  voice: `${voiceRoot}/objects/${voiceFile}`, imageId, manifestId: 'object',
})

const flower = (imageId: string, word: string, voiceFile: string): CommonSoundWordItem => ({
  id: `flower-${imageId}`, word, initial: 'h', category: 'flower',
  voice: `${voiceRoot}/flowers/${voiceFile}`, imageId, manifestId: 'flower',
})

/** Explicit word and voice mapping for the existing Trang Nguyên recordings. */
export const QUESTION_27_WORDS: readonly CommonSoundWordItem[] = [
  animal('b', 'bò', 'b', 'bo.mp3'),
  animal('a', 'cá', 'c', 'ca.mp3'),
  animal('c', 'cò', 'c', 'co.mp3'),
  animal('d', 'dơi', 'd', 'doi.mp3'),
  animal('dd', 'đà điểu', 'đ', 'da-dieu.mp3'),
  animal('e', 've', 'v', 've.mp3'),
  animal('ee', 'dê', 'd', 'de.mp3'),
  animal('g', 'gà', 'g', 'ga.mp3'),
  animal('h', 'hổ', 'h', 'ho.mp3'),
  animal('i', 'chim', 'ch', 'chim.mp3'),
  animal('k', 'kỳ đà', 'k', 'ky-da.mp3'),
  animal('l', 'lợn', 'l', 'lon.mp3'),
  animal('m', 'mèo', 'm', 'meo.mp3'),
  animal('n', 'nai', 'n', 'nai.mp3'),
  animal('o', 'ong', 'o', 'ong.mp3'),
  animal('oo', 'ốc', 'ô', 'oc.mp3'),
  animal('ow', 'hươu', 'h', 'huou.mp3'),
  animal('p', 'bọ cạp', 'b', 'bo-cap.mp3'),
  animal('q', 'quạ', 'qu', 'qua.mp3'),
  animal('r', 'rùa', 'r', 'rua.mp3'),
  animal('s', 'sóc', 's', 'soc.mp3'),
  animal('t', 'thỏ', 'th', 'tho.mp3'),
  animal('u', 'cú', 'c', 'cu.mp3'),
  animal('uw', 'sư tử', 's', 'su-tu.mp3'),
  animal('v', 'voi', 'v', 'voi.mp3'),
  animal('x', 'xén tóc', 'x', 'xen-toc.mp3'),
  animal('y', 'yến', 'y', 'yen.mp3'),

  object('mu', 'mũ', 'm', 'cai-mu.mp3'),
  object('khan', 'khăn', 'kh', 'cai-khan.mp3'),
  object('dep', 'dép', 'd', 'doi-dep.mp3'),
  object('tat', 'tất', 't', 'doi-tat.mp3'),
  object('ba-lo', 'ba lô', 'b', 'cai-ba-lo.mp3'),
  object('but-chi', 'bút chì', 'b', 'but-chi.mp3'),
  object('tay', 'tẩy', 't', 'cuc-tay.mp3'),
  object('thuoc', 'thước', 'th', 'cay-thuoc.mp3'),
  object('vo', 'vở', 'v', 'quyen-vo.mp3'),
  object('sach', 'sách', 's', 'quyen-sach.mp3'),
  object('cap', 'cặp', 'c', 'cai-cap.mp3'),
  object('binh-nuoc', 'bình nước', 'b', 'binh-nuoc.mp3'),
  object('o', 'ô', 'ô', 'cai-o.mp3'),
  object('bong', 'bóng', 'b', 'qua-bong.mp3'),
  object('o-to', 'ô tô', 'ô', 'o-to.mp3'),
  object('gau-bong', 'gấu bông', 'g', 'gau-bong.mp3'),
  object('dong-ho', 'đồng hồ', 'đ', 'dong-ho.mp3'),
  object('den', 'đèn', 'đ', 'cai-den.mp3'),
  object('keo', 'kéo', 'k', 'cai-keo.mp3'),
  object('luoc', 'lược', 'l', 'cai-luoc.mp3'),
  object('ban-chai-danh-rang', 'bàn chải đánh răng', 'b', 'ban-chai-danh-rang.mp3'),
  object('xa-phong', 'xà phòng', 'x', 'xa-phong.mp3'),
  object('coc', 'cốc', 'c', 'cai-coc.mp3'),
  object('thia', 'thìa', 'th', 'cai-thia.mp3'),
  object('ghe', 'ghế', 'gh', 'cai-ghe.mp3'),
  object('chia-khoa', 'chìa khóa', 'ch', 'chia-khoa.mp3'),
  object('dieu', 'diều', 'd', 'cai-dieu.mp3'),

  flower('hoa-lan', 'hoa lan', 'hoa-lan.mp3'),
  flower('hoa-hong', 'hoa hồng', 'hoa-hong.mp3'),
  flower('hoa-huong-duong', 'hoa hướng dương', 'hoa-huong-duong.mp3'),
  flower('hoa-sen', 'hoa sen', 'hoa-sen.mp3'),
  flower('hoa-tulip', 'hoa tulip', 'hoa-tulip.mp3'),
  flower('hoa-cuc', 'hoa cúc', 'hoa-cuc.mp3'),
  flower('hoa-ly', 'hoa ly', 'hoa-ly.mp3'),
  flower('hoa-dam-but', 'hoa dâm bụt', 'hoa-dam-but.mp3'),
]

function normalizeQuestion27VoiceLabel(value: string): string {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Q27 reads each visible word from its own recording, so the asset name must match that word exactly. */
export function isQuestion27VoiceTextAligned(item: CommonSoundWordItem): boolean {
  const voiceFile = item.voice.split('/').pop()?.replace(/\.mp3$/i, '') ?? ''
  return normalizeQuestion27VoiceLabel(item.word) === normalizeQuestion27VoiceLabel(voiceFile)
}

export const QUESTION_27_TEXT_MATCHED_WORDS = QUESTION_27_WORDS.filter(isQuestion27VoiceTextAligned)

export const QUESTION_27_PROMPT = 'Chọn đáp án thích hợp điền vào chỗ trống.'

const QUESTION_27_MULTI_LETTER_SOUNDS = ['ngh', 'ch', 'gh', 'kh', 'nh', 'ng', 'ph', 'th', 'tr', 'qu', 'gi']

function removeVietnameseToneMarks(value: string): string {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD')
    .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '')
    .normalize('NFC')
}

export function getQuestion27Sounds(word: string): string[] {
  const sounds: string[] = []
  for (const syllable of removeVietnameseToneMarks(word).split(/\s+/).filter(Boolean)) {
    const letters = Array.from(syllable)
    for (let index = 0; index < letters.length;) {
      const multigraph = QUESTION_27_MULTI_LETTER_SOUNDS.find(sound => {
        const soundLetters = Array.from(sound)
        return letters.slice(index, index + soundLetters.length).join('') === sound
      })
      if (multigraph) {
        sounds.push(multigraph)
        index += Array.from(multigraph).length
      } else {
        sounds.push(letters[index])
        index += 1
      }
    }
  }
  return Array.from(new Set(sounds))
}

export function buildQuestion27Sentence(words: readonly CommonSoundWordItem[]): string {
  return `Các từ “${words.map(item => item.word).join(', ')}” có chung âm`
}
