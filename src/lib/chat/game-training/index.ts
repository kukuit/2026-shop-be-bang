import { GAME_BASE_TRAINING } from './base'
import { GAME_CATALOG_TRAINING } from './games'
import { GAME_LESSON_ROUTES_TRAINING } from './lesson-routes'

/** Nội dung training riêng cho chatbot ở /game và toàn bộ route con. */
export const GAME_CHAT_TRAINING = [
  GAME_BASE_TRAINING,
  GAME_CATALOG_TRAINING,
  GAME_LESSON_ROUTES_TRAINING,
].join('\n\n')
