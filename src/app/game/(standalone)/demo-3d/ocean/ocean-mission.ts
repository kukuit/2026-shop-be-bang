import { OCEAN_CHEST_SLOTS } from './ocean-layout'

export type OceanNumberedChest = {
  id: string
  number: number
  slot: number
  position: [number, number, number]
}

export type OceanMissionRound = {
  id: string
  targetNumber: number
  chests: [OceanNumberedChest, OceanNumberedChest, OceanNumberedChest]
}

export type OceanMissionPlan = OceanMissionRound[]

/**
 * Adapter boundary for a future lesson Question Bank integration. The MVP
 * generates a session-only number range (1–10) and does not copy the shared
 * learning bank or write game points into the permanent coin economy.
 */
export type OceanQuestionSource = {
  createMission: (seed: number) => OceanMissionPlan
}

function makeRandom(seed: number) {
  let value = seed >>> 0 || 1
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

export function createOceanMissionPlan(seed = Date.now()): OceanMissionPlan {
  const random = makeRandom(seed)
  const targets = shuffle(Array.from({ length: 10 }, (_, index) => index + 1), random)
  return targets.map((targetNumber, roundIndex) => {
    const distractors = shuffle(Array.from({ length: 10 }, (_, index) => index + 1).filter((number) => number !== targetNumber), random).slice(0, 2)
    const values = shuffle([targetNumber, ...distractors], random)
    const slots = shuffle([0, 1, 2], random)
    const chests = values.map((number, index) => {
      const slot = slots[index]
      const [x, z] = OCEAN_CHEST_SLOTS[slot]
      return { id: `round-${roundIndex + 1}-chest-${slot}`, number, slot, position: [x, 0, z] as [number, number, number] }
    }) as OceanMissionRound['chests']
    return { id: `ocean-number-round-${roundIndex + 1}`, targetNumber, chests }
  })
}

export function validateOceanMissionRound(round: OceanMissionRound) {
  if (round.chests.length !== 3) return false
  const numbers = round.chests.map((chest) => chest.number)
  const ids = round.chests.map((chest) => chest.id)
  const slots = round.chests.map((chest) => chest.slot)
  return new Set(numbers).size === 3
    && new Set(ids).size === 3
    && new Set(slots).size === 3
    && round.chests.filter((chest) => chest.number === round.targetNumber).length === 1
    && round.chests.every((chest) => chest.number >= 1 && chest.number <= 10 && chest.position.length === 3)
}

export function validateOceanMissionPlan(plan: OceanMissionPlan) {
  return plan.length === 10
    && plan.every(validateOceanMissionRound)
    && new Set(plan.map((round) => round.targetNumber)).size === 10
}

export const oceanQuestionSource: OceanQuestionSource = { createMission: createOceanMissionPlan }
