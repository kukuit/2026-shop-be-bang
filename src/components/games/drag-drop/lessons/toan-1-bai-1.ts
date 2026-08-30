import { buildAdaptiveQuestions } from '../../general/adaptive'
import { GAME_IDS, LESSON_IDS } from '../../general/tracking'
import { createDragDropLevelForTarget, createRandomizedLevels, DRAG_DROP_LEVELS, DRAG_DROP_SUPPORTED_TARGETS } from '../levels'
import type { DragDropGameConfig } from '../types'

export const TOAN_1_BAI_1_DRAG_DROP_CONFIG: DragDropGameConfig = {
  lessonId: LESSON_IDS.TOAN_1_BAI_1, gameId: GAME_IDS.DRAG_DROP, totalRounds: 10,
  answerDomain: [0, 1, 2, 3, 4, 5], supportedTargets: DRAG_DROP_SUPPORTED_TARGETS,
  initialLevels: DRAG_DROP_LEVELS,
  introVoice: '/games/lessons/lop-1/toan/bai-1/drag-drop/voices/intro.mp3',
  loadLevels: (previous) => {
    const random = createRandomizedLevels(previous)
    return buildAdaptiveQuestions({
      lessonId: LESSON_IDS.TOAN_1_BAI_1, gameId: GAME_IDS.DRAG_DROP,
      supportedTargets: DRAG_DROP_SUPPORTED_TARGETS, totalRounds: 10,
      generateRandomQuestion: (index) => random[index], generateQuestionForTarget: createDragDropLevelForTarget,
    })
  },
}
