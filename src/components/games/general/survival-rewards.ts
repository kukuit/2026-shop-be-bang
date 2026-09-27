export const MAX_SURVIVAL_LEVEL = 25
export const MAX_SURVIVAL_LIVES = 3
export const MAX_SURVIVAL_LIFE_RECOVERIES = 2

export function survivalBaseCoinEarned(levelsCompleted: number) {
  return [5, 10, 15, 20, 25].reduce((sum, milestone, index) =>
    sum + (levelsCompleted >= milestone ? index + 2 : 0), 0)
}

export function survivalRewardMultiplier(playCount: number) {
  return Math.max(0.25, 1 - Math.max(0, playCount - 1) * 0.25)
}

export function survivalFinalCoinEarned(levelsCompleted: number, playCount: number) {
  return Math.round(survivalBaseCoinEarned(levelsCompleted) * survivalRewardMultiplier(playCount))
}
