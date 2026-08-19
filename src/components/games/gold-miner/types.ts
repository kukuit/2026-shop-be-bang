export type TaskObject = 'apple' | 'chicken' | 'cow' | 'fish' | 'star' | 'flower' | 'ball' | 'butterfly'

export type GoldMinerQuestion = {
  id: string
  objectType: TaskObject
  count: number
  correctAnswer: number
  choices: number[]
}

export enum GoldMinerState {
  ROUND_START = 'ROUND_START',
  AIMING = 'AIMING',
  HOOK_DOWN = 'HOOK_DOWN',
  GRABBING = 'GRABBING',
  HOOK_UP = 'HOOK_UP',
  CHECK_ANSWER = 'CHECK_ANSWER',
  ROUND_CLEAR = 'ROUND_CLEAR',
  NEXT_ROUND = 'NEXT_ROUND',
  GAME_COMPLETE = 'GAME_COMPLETE',
}

export enum WolfState {
  IDLE = 'IDLE',
  PEEK = 'PEEK',
  RUN_TO_GOLD = 'RUN_TO_GOLD',
  STEAL = 'STEAL',
  HIT = 'HIT',
  ESCAPE = 'ESCAPE',
  COOLDOWN = 'COOLDOWN',
}
