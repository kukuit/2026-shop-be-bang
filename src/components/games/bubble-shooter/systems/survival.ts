import { MAX_SURVIVAL_LEVEL, MAX_SURVIVAL_LIVES, survivalBaseCoinEarned, survivalRewardMultiplier, survivalFinalCoinEarned } from '../../general/survival-rewards'
export { MAX_SURVIVAL_LIFE_RECOVERIES } from '../../general/survival-rewards'

export const MAX_LEVEL = MAX_SURVIVAL_LEVEL
export const MAX_LIVES = MAX_SURVIVAL_LIVES

export function speedMultiplier(level: number) {
  return 1 + Math.min(MAX_LEVEL - 1, Math.max(0, level - 1)) / 24 * 0.4
}

export const baseCoinEarned = survivalBaseCoinEarned

export const rewardMultiplier = survivalRewardMultiplier

export const finalCoinEarned = survivalFinalCoinEarned
