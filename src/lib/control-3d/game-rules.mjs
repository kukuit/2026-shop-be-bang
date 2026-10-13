export const PLAYER_CONFIG = Object.freeze({
  moveSpeed: 6.2,
  rotationSpeed: 2.35,
  jumpForce: 6.2,
  maxHealth: 100,
  invulnerabilitySeconds: 0.72,
})

export const WEAPON_CONFIG = Object.freeze({
  magazineSize: 24,
  reserveAmmo: 144,
  fireRateSeconds: 0.18,
  bulletDamage: 1,
  reloadSeconds: 1.1,
  range: 42,
})

export const MONSTER_CONFIG = Object.freeze({
  normal: { health: 2, speed: 1.75, damage: 8, attackRange: 1.45, attackCooldown: 1.35, score: 10, scale: 1, tint: '#e87045' },
  fast: { health: 2, speed: 3.05, damage: 6, attackRange: 1.3, attackCooldown: 1.05, score: 20, scale: 0.82, tint: '#8d65d7' },
  boss: { health: 30, speed: 1.25, damage: 18, attackRange: 3.1, attackCooldown: 2.3, telegraph: 0.72, score: 100, scale: 2.15, tint: '#763b45' },
})

export const CONTROL_LEVELS = Object.freeze([
  { name: 'ĐƯỜNG VÀO RỪNG', theme: 'forest', counts: { normal: 3, fast: 0, boss: 0 }, seed: 101, obstacles: [{ x: -5.4, z: 1.2, radius: 1.05, kind: 'tree' }, { x: 5.1, z: 8, radius: 1.1, kind: 'tree' }, { x: -5.2, z: 15, radius: 1.15, kind: 'rock' }] },
  { name: 'RỪNG SÂU', theme: 'deep-forest', counts: { normal: 5, fast: 0, boss: 0 }, seed: 207, obstacles: [{ x: -5.4, z: -1, radius: 1.15, kind: 'tree' }, { x: 5.3, z: 3.5, radius: 1.15, kind: 'tree' }, { x: -4.8, z: 9, radius: 1.2, kind: 'tree' }, { x: 5.5, z: 16, radius: 1.15, kind: 'rock' }] },
  { name: 'CON ĐƯỜNG ĐÁ', theme: 'stone', counts: { normal: 4, fast: 2, boss: 0 }, seed: 303, obstacles: [{ x: -5.2, z: 1, radius: 1, kind: 'rock' }, { x: 5.3, z: 6, radius: 1, kind: 'rock' }, { x: -5.4, z: 13, radius: 1.1, kind: 'rock' }, { x: 5.1, z: 18, radius: 1.1, kind: 'pillar' }] },
  { name: 'KHU VỰC ĐỔ NÁT', theme: 'ruins', counts: { normal: 6, fast: 3, boss: 0 }, seed: 409, obstacles: [{ x: -5.3, z: 0, radius: 1.15, kind: 'pillar' }, { x: 5.1, z: 2.8, radius: 1.15, kind: 'pillar' }, { x: -5.4, z: 7.8, radius: 1.15, kind: 'crate' }, { x: 5.5, z: 12, radius: 1.15, kind: 'pillar' }, { x: -5.1, z: 17, radius: 1.15, kind: 'rock' }] },
  { name: 'CỔNG THÀNH BOSS', theme: 'citadel', counts: { normal: 4, fast: 0, boss: 1 }, seed: 512, obstacles: [{ x: -5.2, z: 2, radius: 1.2, kind: 'pillar' }, { x: 5.3, z: 6, radius: 1.2, kind: 'pillar' }, { x: -5.2, z: 13, radius: 1.2, kind: 'crate' }, { x: 5.3, z: 18, radius: 1.2, kind: 'pillar' }] },
])

export const EMPTY_PLAYER_INPUT = Object.freeze({
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fire: false,
  jump: false,
  reload: false,
  menu: false,
  skillQ: false,
  skillE: false,
  weaponCannon: false,
  weaponIce: false,
})

export function clampAxis(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(-1, Math.min(1, value))
}

export function normalizePlayerInput(value) {
  const input = value && typeof value === 'object' ? value : {}
  return {
    moveX: clampAxis(input.moveX),
    moveY: clampAxis(input.moveY),
    aimX: clampAxis(input.aimX),
    aimY: clampAxis(input.aimY),
    fire: input.fire === true,
    jump: input.jump === true,
    reload: input.reload === true,
    menu: input.menu === true,
    skillQ: input.skillQ === true,
    skillE: input.skillE === true,
    weaponCannon: input.weaponCannon === true,
    weaponIce: input.weaponIce === true,
  }
}

export function createLevelWave(levelIndex, random = Math.random) {
  const config = CONTROL_LEVELS[levelIndex]
  if (!config) return []
  const wave = []
  let sequence = 0
  for (const kind of ['normal', 'fast', 'boss']) {
    for (let i = 0; i < config.counts[kind]; i += 1) {
      const x = (random() * 2 - 1) * (kind === 'boss' ? 0.7 : 4.4)
      const z = 1 + random() * 16 + (i % 3) * 1.6
      wave.push({ id: `level-${levelIndex + 1}-${kind}-${sequence++}`, kind, x, z })
    }
  }
  return wave
}

export function scoreForMonster(kind) {
  return MONSTER_CONFIG[kind]?.score ?? 0
}

export function applyMonsterDamage(monster, damage = WEAPON_CONFIG.bulletDamage) {
  const remainingHealth = Math.max(0, monster.health - Math.max(0, damage))
  return { health: remainingHealth, defeated: remainingHealth <= 0, score: remainingHealth <= 0 ? scoreForMonster(monster.kind) : 0 }
}

export function isCooldownReady(now, nextAllowedAt) {
  return Number.isFinite(now) && Number.isFinite(nextAllowedAt) && now >= nextAllowedAt
}

export function nextCooldownAt(now, durationSeconds) {
  return now + Math.max(0, durationSeconds)
}

export function canApplyDamage(nowMs, lastDamageAtMs, invulnerabilitySeconds = PLAYER_CONFIG.invulnerabilitySeconds) {
  return Number.isFinite(nowMs) && (lastDamageAtMs === -Infinity || Number.isFinite(lastDamageAtMs) && nowMs - lastDamageAtMs >= invulnerabilitySeconds * 1000)
}

export function createRunReset({ restart, levelIndex = 0, score = 0, kills = 0, reserveAmmo = WEAPON_CONFIG.reserveAmmo }) {
  return {
    levelIndex: restart ? 0 : Math.max(0, Math.min(CONTROL_LEVELS.length - 1, levelIndex)),
    score: restart ? 0 : Math.max(0, score),
    kills: restart ? 0 : Math.max(0, kills),
    health: PLAYER_CONFIG.maxHealth,
    magazine: WEAPON_CONFIG.magazineSize,
    reserveAmmo: restart ? WEAPON_CONFIG.reserveAmmo : Math.min(WEAPON_CONFIG.reserveAmmo, Math.max(0, reserveAmmo) + 32),
    gameStatus: 'PLAYING',
  }
}

export function canEnterGate(status, enemiesRemaining) {
  return status === 'LEVEL_CLEAR' && enemiesRemaining === 0
}

export function getNextLevelIndex(levelIndex) {
  return Math.min(CONTROL_LEVELS.length - 1, Math.max(0, levelIndex + 1))
}

export function normalizeGameStatusPacket(value) {
  const packet = value && typeof value === 'object' ? value : {}
  const number = (input, min, max) => typeof input === 'number' && Number.isFinite(input) ? Math.max(min, Math.min(max, input)) : 0
  const status = ['MENU', 'PLAYING', 'LEVEL_CLEAR', 'PAUSED', 'GAME_OVER', 'VICTORY'].includes(packet.gameStatus) ? packet.gameStatus : 'MENU'
  const result = {
    level: Math.round(number(packet.level, 1, CONTROL_LEVELS.length)),
    health: number(packet.health, 0, PLAYER_CONFIG.maxHealth),
    maxHealth: number(packet.maxHealth, 1, PLAYER_CONFIG.maxHealth),
    score: Math.round(number(packet.score, 0, 10000000)),
    enemiesRemaining: Math.round(number(packet.enemiesRemaining, 0, 100)),
    gameStatus: status,
  }
  if (Array.isArray(packet.players)) {
    result.players = packet.players.slice(0, 2).map((player) => {
      const normalized = {
        hp: Math.round(number(player?.hp, 0, 6)),
        maxHp: Math.round(number(player?.maxHp, 1, 6)),
        ammo: Math.round(number(player?.ammo, 0, 30)),
        maxAmmo: Math.round(number(player?.maxAmmo, 1, 30)),
        ...(typeof player?.health === 'number' ? { health: number(player.health, 0, 100) } : {}),
        ...(typeof player?.maxHealth === 'number' ? { maxHealth: number(player.maxHealth, 1, 100) } : {}),
        ...(player?.weaponMode === 'cannon' || player?.weaponMode === 'ice' || player?.weaponMode === null ? { weaponMode: player.weaponMode } : {}),
        ...(typeof player?.weaponRemaining === 'number' ? { weaponRemaining: number(player.weaponRemaining, 0, 10000) } : {}),
        ...(player?.weaponInventory && typeof player.weaponInventory === 'object' ? { weaponInventory: {
          cannon: Math.round(number(player.weaponInventory.cannon, 0, 9)),
          ice: Math.round(number(player.weaponInventory.ice, 0, 9)),
        } } : {}),
      }
      return normalized
    })
  }
  return result
}
