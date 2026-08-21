import { GAME_CHAT_TRAINING } from './game-training'
import { SHOP_CHAT_TRAINING } from './shop-training'

export const CHAT_CONTEXTS = ['game', 'shop'] as const
export type ChatContext = (typeof CHAT_CONTEXTS)[number]

export function isChatContext(value: unknown): value is ChatContext {
  return typeof value === 'string' && CHAT_CONTEXTS.includes(value as ChatContext)
}

export const SYSTEM_PROMPTS: Record<ChatContext, string> = {
  game: GAME_CHAT_TRAINING,
  shop: SHOP_CHAT_TRAINING,
}
