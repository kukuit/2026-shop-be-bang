import type { ControlLevelConfig, GameStatus, GameStatusPacket, MonsterKind, MonsterSpawn, PlayerInput } from './types'

export const PLAYER_CONFIG: Readonly<{ moveSpeed: number; rotationSpeed: number; jumpForce: number; maxHealth: number; invulnerabilitySeconds: number }>
export const WEAPON_CONFIG: Readonly<{ magazineSize: number; reserveAmmo: number; fireRateSeconds: number; bulletDamage: number; reloadSeconds: number; range: number }>
export const MONSTER_CONFIG: Readonly<Record<MonsterKind, { health: number; speed: number; damage: number; attackRange: number; attackCooldown: number; telegraph?: number; score: number; scale: number; tint: string }>>
export const CONTROL_LEVELS: readonly ControlLevelConfig[]
export const EMPTY_PLAYER_INPUT: Readonly<PlayerInput>
export function clampAxis(value: unknown): number
export function normalizePlayerInput(value: unknown): PlayerInput
export function createLevelWave(levelIndex: number, random?: () => number): MonsterSpawn[]
export function scoreForMonster(kind: MonsterKind): number
export function applyMonsterDamage(monster: { kind: MonsterKind; health: number }, damage?: number): { health: number; defeated: boolean; score: number }
export function isCooldownReady(now: number, nextAllowedAt: number): boolean
export function nextCooldownAt(now: number, durationSeconds: number): number
export function canApplyDamage(nowMs: number, lastDamageAtMs: number, invulnerabilitySeconds?: number): boolean
export function createRunReset(args: { restart: boolean; levelIndex?: number; score?: number; kills?: number; reserveAmmo?: number }): { levelIndex: number; score: number; kills: number; health: number; magazine: number; reserveAmmo: number; gameStatus: GameStatus }
export function canEnterGate(status: GameStatus, enemiesRemaining: number): boolean
export function getNextLevelIndex(levelIndex: number): number
export function normalizeGameStatusPacket(value: unknown): GameStatusPacket
