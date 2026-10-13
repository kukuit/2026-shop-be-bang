export type GameStatus = 'MENU' | 'PLAYING' | 'LEVEL_CLEAR' | 'PAUSED' | 'GAME_OVER' | 'VICTORY'

export type MonsterKind = 'normal' | 'fast' | 'boss'

export type PlayerInput = {
  moveX: number
  moveY: number
  aimX: number
  aimY: number
  fire: boolean
  jump: boolean
  reload: boolean
  menu: boolean
  skillQ: boolean
  skillE: boolean
  weaponCannon?: boolean
  weaponIce?: boolean
}

export type MonsterSpawn = {
  id: string
  kind: MonsterKind
  x: number
  z: number
}

export type ControlLevelConfig = {
  name: string
  theme: 'forest' | 'deep-forest' | 'stone' | 'ruins' | 'citadel'
  counts: Record<MonsterKind, number>
  seed: number
  obstacles: Array<{ x: number; z: number; radius: number; kind: 'tree' | 'rock' | 'pillar' | 'crate' }>
}

export type EnemyState = {
  id: string
  kind: MonsterKind
  x: number
  z: number
  health: number
  maxHealth: number
}

export type GameStatusPacket = {
  level: number
  health: number
  maxHealth: number
  score: number
  enemiesRemaining: number
  gameStatus: GameStatus
  players?: Array<{ hp: number; maxHp: number; health?: number; maxHealth?: number; ammo: number; maxAmmo: number; weaponMode?: 'cannon' | 'ice' | null; weaponRemaining?: number; weaponInventory?: { cannon: number; ice: number } }>
}

export type ControllerConnectionState = 'disabled' | 'disconnected' | 'connecting' | 'connected' | 'rejected'
