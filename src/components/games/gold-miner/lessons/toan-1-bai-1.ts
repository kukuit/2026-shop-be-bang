import { buildAdaptiveQuestions } from '../../general/adaptive'
import { GAME_IDS, LESSON_IDS } from '../../general/tracking'
import { createGoldMinerQuestionForTarget, createRandomizedGoldMinerQuestions, GOLD_MINER_SUPPORTED_TARGETS } from '../levels'
import type { GoldMinerGameConfig } from '../types'

export const TOAN_1_BAI_1_GOLD_MINER_CONFIG: GoldMinerGameConfig = {
  lessonId: LESSON_IDS.TOAN_1_BAI_1, gameId: GAME_IDS.GOLD_MINING, totalRounds: 10,
  answerDomain: [0, 1, 2, 3, 4, 5], supportedTargets: GOLD_MINER_SUPPORTED_TARGETS,
  introVoice: '/games/lessons/lop-1/toan/bai-1/gold-mining/voices/intro.mp3',
  loadQuestions: () => {
    const random = createRandomizedGoldMinerQuestions()
    return buildAdaptiveQuestions({
      lessonId: LESSON_IDS.TOAN_1_BAI_1, gameId: GAME_IDS.GOLD_MINING,
      supportedTargets: GOLD_MINER_SUPPORTED_TARGETS, totalRounds: 10,
      generateRandomQuestion: (index) => random[index],
      generateQuestionForTarget: createGoldMinerQuestionForTarget,
    })
  },
}
