import { createQuestionPool, shuffle, type MathGame } from '../../lop-2/toan/bai-1/content'
import { createMathQuestionVoice } from '@/components/games/general/math-voice'
import type { VoiceSegment } from '@/components/games/general/composed-voice'

export const GAME_NAMES: Record<MathGame, string> = {
  'bubble-shooter': 'Bắn bóng',
  'gold-mining': 'Đào vàng',
  racing: 'Đua xe',
  'drag-drop': 'Kéo thả',
}

export type VoiceSample = { id: string; game: MathGame; text: string; sequence: VoiceSegment[] }

/** Five distinct composed sentences per game; use the same adapter as gameplay. */
export function generateVoiceSamples(random = Math.random): VoiceSample[] {
  const used = new Set<string>()
  const samples: VoiceSample[] = []
  for (const game of Object.keys(GAME_NAMES) as MathGame[]) {
    let count = 0
    for (const question of shuffle(createQuestionPool(game, random), random)) {
      if (used.has(question.voiceText)) continue
      const sequence = createMathQuestionVoice(question.voiceText).voiceSequence
      if (!sequence || sequence.length < 2) continue
      samples.push({ id: `${game}:${question.id}`, game, text: question.voiceText, sequence })
      used.add(question.voiceText)
      if (++count === 5) break
    }
  }
  return shuffle(samples, random)
}
