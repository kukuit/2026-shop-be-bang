import { createEnglishGameConfigs } from './create-game-configs'
import { TIENG_ANH_1_BAI_2 } from '@/app/game/lop-1/tieng-anh/bai-2/lesson'
import { TIENG_ANH_1_BAI_2_IMAGES } from '@/app/game/lop-1/tieng-anh/bai-2/images'
import { createEnglishQuestions, TIENG_ANH_1_BAI_2_QUESTION_POOL } from '@/app/game/lop-1/tieng-anh/bai-2/content'

const configs = createEnglishGameConfigs({
  lessonId: TIENG_ANH_1_BAI_2.lessonId, title: TIENG_ANH_1_BAI_2.title,
  images: TIENG_ANH_1_BAI_2_IMAGES, createQuestions: createEnglishQuestions,
  initialQuestions: TIENG_ANH_1_BAI_2.learningGoals.map(goal => TIENG_ANH_1_BAI_2_QUESTION_POOL.find(q => q.goalKey === goal.key)!),
})
export const TIENG_ANH_1_BAI_2_BUBBLE_CONFIG = configs.bubble
export const TIENG_ANH_1_BAI_2_DRAG_CONFIG = configs.drag
export const TIENG_ANH_1_BAI_2_GOLD_CONFIG = configs.gold
export const TIENG_ANH_1_BAI_2_RACING_CONFIG = configs.racing
