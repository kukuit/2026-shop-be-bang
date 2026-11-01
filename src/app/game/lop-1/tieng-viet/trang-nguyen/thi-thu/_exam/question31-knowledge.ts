import schoolEventsManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/school-events-4sheet.manifest.json'
import { emojiVisual } from './mock-assets'
import type { ExamVisual } from './types'

export const SCHOOL_EVENT_PROMPT = 'Sự kiện nào đang diễn ra trong hình?'
export const SCHOOL_EVENT_PROMPT_VOICE = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/su-kien-nao-dang-dien-ra-trong-hinh.mp3'
export const SCHOOL_EVENTS_SPRITESHEET_READY = true

export const SCHOOL_EVENTS = [
  {
    id: 'le-khai-giang',
    label: 'lễ khai giảng',
    fallbackEmoji: '🏫🎒',
    voice: '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/le-khai-giang.mp3',
  },
  {
    id: 'le-be-giang',
    label: 'lễ bế giảng',
    fallbackEmoji: '🏫🎓',
    voice: '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/le-be-giang.mp3',
  },
  {
    id: 'tet-thieu-nhi',
    label: 'tết thiếu nhi',
    fallbackEmoji: '🎈🧒',
    voice: '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/tet-thieu-nhi.mp3',
  },
  {
    id: 'ngay-nha-giao-viet-nam',
    label: 'ngày nhà giáo việt nam',
    fallbackEmoji: '👩‍🏫💐',
    voice: '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/ngay-nha-giao-viet-nam.mp3',
  },
] as const

export type SchoolEventId = typeof SCHOOL_EVENTS[number]['id']
export type SchoolEvent = typeof SCHOOL_EVENTS[number]

export function getSchoolEventVisual(event: SchoolEvent): ExamVisual {
  if (!SCHOOL_EVENTS_SPRITESHEET_READY) return emojiVisual(event.fallbackEmoji, 'Hình minh họa sự kiện')

  const item = schoolEventsManifest.items.find(candidate => candidate.id === event.id)
  if (!item) throw new Error(`Missing school event image crop: ${event.id}`)
  return {
    type: 'image',
    value: schoolEventsManifest.image,
    label: 'Hình minh họa sự kiện',
    sprite: {
      spriteSheet: schoolEventsManifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: schoolEventsManifest.width,
      sheetHeight: schoolEventsManifest.height,
    },
  }
}
