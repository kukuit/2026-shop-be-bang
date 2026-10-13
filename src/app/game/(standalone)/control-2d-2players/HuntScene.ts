import * as Phaser from 'phaser'
import { MAX_PLAYER_HEARTS } from './constants'

export type HuntStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'WON' | 'LOST'
export type HuntDifficulty = 'easy' | 'normal' | 'hard'
export type HuntMode = 'SURVIVAL' | 'BOSS_TEST'
export type WeaponMode = 'cannon' | 'ice'
export type RemoteHuntInput = { aimX: number; aimY: number; fire: boolean }
export type PlayerSnapshot = {
  playerId: 1 | 2
  hp: number
  health: number
  maxHealth: number
  score: number
  kills: number
  ammo: number
  maxAmmo: number
  combo: number
  connected: boolean
  reloadRemaining: number
  abilityCooldowns: [number, number]
  weaponMode: WeaponMode | null
  weaponRemaining: number
  weaponInventory: Record<WeaponMode, number>
}
export type HuntSnapshot = {
  status: HuntStatus
  kills: number
  stage: number
  phase: 'SURVIVAL' | 'BOSS'
  bossName: string
  bossHealth: number
  bossMaxHealth: number
  bossHeartsRemaining: number
  difficulty: HuntDifficulty
  players: [PlayerSnapshot, PlayerSnapshot]
  activeEnemies: number
}

type PlayerState = PlayerSnapshot & {
  aimX: number
  aimY: number
  fire: boolean
  nextShotAt: number
  reloadAt: number
  abilityReadyAt: [number, number]
  lastKillAt: number
  weaponMode: WeaponMode | null
  weaponExpiresAt: number
  invulnerableUntil: number
  hitFlashUntil: number
}
type EnemyType = 'boar' | 'bat' | 'ca-sau' | 'dai-bang' | 'hoa-an-thit' | 'nguoi-da' | 'nhen' | 'ong-bap-cai' | 'qua' | 'su-tu' | 'tinh-tinh' | 'yeu-tinh'
type EnemyFrameRect = { x: number; y: number; width: number; height: number }
type SpawnCategory = 'GROUND' | 'FLYING' | 'SPECIAL'
type MovementPattern = 'DIRECT' | 'ZIGZAG' | 'DIAGONAL' | 'SIDE_STEP' | 'HOP' | 'FLYING_SWOOP' | 'BURST'
type EnemyAIState = 'SPAWN' | 'APPROACH' | 'CLOSE_IN' | 'WINDUP' | 'ATTACK' | 'RECOVERY' | 'RETREAT' | 'HIT_REACTION' | 'DEAD'
type EnemyMovementConfig = {
  spawnCategory: SpawnCategory
  movementPatterns: Array<{ type: MovementPattern; weight: number }>
  approachSpeed: number
  lateralSpeed: number
  zigzagAmplitude: number
  hopHeight: number
  closeInDuration: number
  windupDuration: number
  attackDuration: number
  recoveryDuration: number
  attackRange: number
  attackDamage: number
  attackCooldown: number
  hitKnockback: number
}
type EnemySpec = { file: string; airborne: boolean; moveFrames: number[]; frameRate: number; attackFrames?: number[]; movement: EnemyMovementConfig } & (
  | { frameWidth: number; frameHeight: number; frameRects?: never }
  | { frameRects: readonly EnemyFrameRect[]; frameWidth?: never; frameHeight?: never }
)
type EnemyState = {
  enemyId: number
  type: EnemyType
  image: Phaser.GameObjects.Sprite
  shadow: Phaser.GameObjects.Ellipse
  healthBar: Phaser.GameObjects.Graphics
  tether: Phaser.GameObjects.Graphics | null
  health: number
  maxHealth: number
  sizeScale: number
  attackDamage: number
  progress: number
  homeX: number
  lane: number
  travelMs: number
  frozenUntil: number
  isBoss: boolean
  attackReadyAt: number
  airLift: number
  spawnCategory: SpawnCategory
  aiState: EnemyAIState
  stateStartedAt: number
  spawnedAt: number
  targetPlayerId: 1 | 2
  pattern: MovementPattern | null
  movementDirection: -1 | 1
  directionChangeMs: number
  nextDirectionChangeAt: number
  patternPhase: number
  patternChangeAt: number
  patternStartedAt: number
  patternStartX: number
  patternTargetX: number
  sideStepStartedAt: number
  spawnX: number
  startY: number
  goalY: number
  approachY: number
  bodyY: number
  groundY: number
  currentX: number
  attackStartX: number
  attackStartY: number
  attackStartGroundY: number
  attackEndX: number
  attackEndY: number
  attackEndGroundY: number
  attackHasHit: boolean
  despawnAfterAttack: boolean
  attackFromDistance: boolean
  windupDuration: number
  frozenStartedAt: number
  resumeStateAfterHit: EnemyAIState
  deathScaleX: number
  deathScaleY: number
  deathRotation: number
  debugLabel: Phaser.GameObjects.Text | null
}
type HeartPickup = { container: Phaser.GameObjects.Container; x: number; y: number; expiresAt: number; bossReward: boolean }
type WeaponPickup = { container: Phaser.GameObjects.Container; x: number; y: number; expiresAt: number; weapon: WeaponMode }
type ShotTrace = { playerId: 1 | 2; aimX: number; aimY: number; expiresAt: number; hit: boolean; weaponMode: WeaponMode | null }

const WIDTH = 1920
const HEIGHT = 1080
const SURVIVAL_DURATION_MS = 150_000
const MAX_ACTIVE_ENEMIES = 6
const SPAWN_INTERVAL_MS = 1800
const SURVIVAL_SPAWN_INTERVALS = [1800, 1575, 1350, 1125, 900] as const
const MAX_ACTIVE_BOSS_MINIONS = 2
const BOSS_MINION_SPAWN_INTERVAL_MULTIPLIER = 3.33
const MAGAZINE_SIZE = 30
const PLAYER_HEALTH_PER_HEART = 100
const FIRE_RATE_MS = 180
const CANNON_FIRE_RATE_MS = 85
const WEAPON_DURATION_MS = 10_000
const HEART_DROP_CHANCE = 0.03
const WEAPON_DROP_CHANCE = 0.01
const PICKUP_LIFETIME_MS = 9_000
const RELOAD_MS = 1500
const SHOT_DAMAGE = 10
const DIFFICULTY_HEALTH: Record<HuntDifficulty, number> = { easy: 0.55, normal: 1, hard: 1.8 }
const BOSS_HEALTH: Record<HuntDifficulty, readonly [number, number]> = { easy: [1600, 2000], normal: [2600, 3200], hard: [4000, 4800] }
const ENEMY_SIZE_TIERS = [
  { scale: 0.68, health: 10, attackDamage: 20 },
  { scale: 0.82, health: 20, attackDamage: 20 },
  { scale: 0.96, health: 30, attackDamage: 30 },
  { scale: 1.1, health: 40, attackDamage: 30 },
  { scale: 1.24, health: 50, attackDamage: 45 },
] as const
const getSurvivalSpawnInterval = (stage: number) => SURVIVAL_SPAWN_INTERVALS[Math.min(4, Math.max(0, Math.floor(stage) - 1))] ?? SPAWN_INTERVAL_MS
const getBossMinionSpawnInterval = (stage: number) => Math.round(getSurvivalSpawnInterval(stage) * BOSS_MINION_SPAWN_INTERVAL_MULTIPLIER)
const movement = (
  spawnCategory: SpawnCategory,
  movementPatterns: EnemyMovementConfig['movementPatterns'],
  overrides: Partial<Omit<EnemyMovementConfig, 'spawnCategory' | 'movementPatterns'>> = {},
): EnemyMovementConfig => ({
  spawnCategory,
  movementPatterns,
  approachSpeed: spawnCategory === 'FLYING' ? 68 : 54,
  lateralSpeed: 92,
  zigzagAmplitude: 92,
  hopHeight: 42,
  closeInDuration: 360,
  windupDuration: 430,
  attackDuration: 560,
  recoveryDuration: 680,
  attackRange: 270,
  attackDamage: 30,
  attackCooldown: 2200,
  hitKnockback: 18,
  ...overrides,
})
const movementPattern = (type: MovementPattern, weight = 1) => ({ type, weight })
// Lion poses have uneven widths. Each rectangle includes a little transparent
// padding without reaching the adjacent pose in the original PNG.
const LION_FRAME_RECTS: readonly EnemyFrameRect[] = [
  { x: 22, y: 0, width: 364, height: 543 },
  { x: 399, y: 0, width: 315, height: 543 },
  { x: 734, y: 0, width: 371, height: 543 },
  { x: 1118, y: 0, width: 322, height: 543 },
  { x: 23, y: 543, width: 370, height: 543 },
  { x: 393, y: 543, width: 351, height: 543 },
  { x: 754, y: 543, width: 356, height: 543 },
  { x: 1115, y: 543, width: 321, height: 543 },
]
// The goblin poses have uneven widths; the sixth pose carries its flying rock
// in the adjacent source area, so each frame is cropped from its own atlas cell.
const YEU_TINH_FRAME_RECTS: readonly EnemyFrameRect[] = [
  { x: 67, y: 0, width: 365, height: 543 },
  { x: 592, y: 0, width: 316, height: 543 },
  { x: 1067, y: 0, width: 366, height: 543 },
  { x: 1590, y: 0, width: 320, height: 543 },
  { x: 65, y: 543, width: 370, height: 543 },
  { x: 572, y: 543, width: 356, height: 543 },
  { x: 1014, y: 543, width: 472, height: 543 },
  { x: 1599, y: 543, width: 302, height: 543 },
]
// Other sheets use equal 4-column × 2-row cells. The first poses form the
// approach loop; hit and fall poses stay out of the movement animation.
const ENEMY_SPECS: Record<EnemyType, EnemySpec> = {
  boar: { file: 'wild-boar', frameWidth: 384, frameHeight: 512, airborne: false, moveFrames: [0, 1, 2, 3], attackFrames: [4, 5, 6], frameRate: 9, movement: movement('GROUND', [movementPattern('DIRECT', 2), movementPattern('ZIGZAG', 3), movementPattern('BURST', 2)], { approachSpeed: 58, attackDamage: 34 }) },
  bat: { file: 'doi', frameWidth: 362, frameHeight: 543, airborne: true, moveFrames: [0, 1, 2, 3], attackFrames: [4, 5], frameRate: 12, movement: movement('FLYING', [movementPattern('FLYING_SWOOP', 3), movementPattern('ZIGZAG', 2)], { approachSpeed: 74, attackRange: 310, attackDamage: 26 }) },
  'ca-sau': { file: 'ca-sau', frameWidth: 384, frameHeight: 512, airborne: false, moveFrames: [0, 2, 1, 2], attackFrames: [4, 5], frameRate: 8, movement: movement('GROUND', [movementPattern('DIRECT', 3), movementPattern('BURST', 2)], { approachSpeed: 43, lateralSpeed: 66, attackDamage: 34, attackCooldown: 2500 }) },
  'dai-bang': { file: 'dai-bang', frameWidth: 376, frameHeight: 543, airborne: true, moveFrames: [0, 1, 2, 1], attackFrames: [4, 5, 6], frameRate: 10, movement: movement('FLYING', [movementPattern('FLYING_SWOOP', 3), movementPattern('BURST', 2)], { approachSpeed: 82, lateralSpeed: 108, attackRange: 340, attackDamage: 34, attackDuration: 620 }) },
  'hoa-an-thit': { file: 'hoa-an-thit', frameWidth: 362, frameHeight: 543, airborne: false, moveFrames: [0, 1, 2, 1], attackFrames: [4, 5, 6], frameRate: 6, movement: movement('GROUND', [movementPattern('DIRECT', 2), movementPattern('ZIGZAG', 2)], { approachSpeed: 40, lateralSpeed: 64, attackDamage: 24, attackCooldown: 2700 }) },
  'nguoi-da': { file: 'nguoi-da', frameWidth: 420, frameHeight: 543, airborne: false, moveFrames: [0, 1, 3, 1], attackFrames: [2, 4], frameRate: 7, movement: movement('GROUND', [movementPattern('DIRECT', 3), movementPattern('SIDE_STEP', 2)], { approachSpeed: 38, lateralSpeed: 78, zigzagAmplitude: 58, hopHeight: 14, attackDamage: 38, attackDuration: 650, recoveryDuration: 780 }) },
  nhen: { file: 'nhen', frameWidth: 362, frameHeight: 543, airborne: false, moveFrames: [0, 2, 1, 3], frameRate: 9, movement: movement('SPECIAL', [], { approachSpeed: 54, attackDamage: 30 }) },
  'ong-bap-cai': { file: 'ong-bap-cai', frameWidth: 420, frameHeight: 512, airborne: true, moveFrames: [0, 1, 2, 1], attackFrames: [4, 5, 7], frameRate: 13, movement: movement('FLYING', [movementPattern('FLYING_SWOOP', 3), movementPattern('ZIGZAG', 2)], { approachSpeed: 78, lateralSpeed: 124, zigzagAmplitude: 116, attackDamage: 24, attackCooldown: 1800 }) },
  qua: { file: 'qua', frameWidth: 420, frameHeight: 543, airborne: true, moveFrames: [0, 1, 2, 1], attackFrames: [5], frameRate: 11, movement: movement('FLYING', [movementPattern('FLYING_SWOOP', 3), movementPattern('ZIGZAG', 2)], { approachSpeed: 65, attackRange: 320, attackDamage: 30 }) },
  'su-tu': { file: 'su-tu', frameRects: LION_FRAME_RECTS, airborne: false, moveFrames: [0, 1, 3, 1], attackFrames: [4, 5], frameRate: 9, movement: movement('GROUND', [movementPattern('DIRECT', 2), movementPattern('ZIGZAG', 2), movementPattern('BURST', 3)], { approachSpeed: 56, lateralSpeed: 88, attackDamage: 36, attackCooldown: 2400 }) },
  'tinh-tinh': { file: 'tinh-tinh', frameWidth: 410, frameHeight: 543, airborne: false, moveFrames: [0, 1, 3, 1], attackFrames: [4, 5], frameRate: 8, movement: movement('GROUND', [movementPattern('DIRECT', 2), movementPattern('SIDE_STEP', 3), movementPattern('HOP', 2)], { approachSpeed: 56, lateralSpeed: 92, hopHeight: 52, attackDamage: 32 }) },
  'yeu-tinh': { file: 'yeu-tinh', frameRects: YEU_TINH_FRAME_RECTS, airborne: false, moveFrames: [0, 1, 3, 1], attackFrames: [4, 5, 6], frameRate: 10, movement: movement('GROUND', [movementPattern('ZIGZAG', 3), movementPattern('SIDE_STEP', 2), movementPattern('HOP', 1)], { approachSpeed: 63, lateralSpeed: 110, hopHeight: 48, attackDamage: 28, attackCooldown: 1900 }) },
}
const ENEMY_TYPES = Object.keys(ENEMY_SPECS) as EnemyType[]
const ENEMY_UNLOCK_GROUPS: ReadonlyArray<ReadonlyArray<EnemyType>> = [
  ['boar', 'bat', 'ca-sau'],
  ['dai-bang', 'hoa-an-thit'],
  ['nguoi-da', 'nhen'],
  ['ong-bap-cai', 'qua'],
  ['su-tu', 'tinh-tinh', 'yeu-tinh'],
]
const DEV_TEST = process.env.NODE_ENV !== 'production'
const PLAYER_COLORS: Record<1 | 2, number> = { 1: 0x43d4ff, 2: 0xff63aa }

export class HuntScene extends Phaser.Scene {
  /** React bridge callbacks are assigned before Phaser boots the scene. */
  onSnapshot?: (snapshot: HuntSnapshot) => void
  onReady?: () => void

  private background!: Phaser.GameObjects.Image
  private depth!: Phaser.GameObjects.Graphics
  private players!: [PlayerState, PlayerState]
  private playerSprites!: [Phaser.GameObjects.Image, Phaser.GameObjects.Image]
  private crosshairs!: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics]
  private enemyDebugGraphics!: Phaser.GameObjects.Graphics
  private enemies: EnemyState[] = []
  private nextEnemyId = 1
  private heartPickups: HeartPickup[] = []
  private weaponPickups: WeaponPickup[] = []
  private traces: ShotTrace[] = []
  private gameStatus: HuntStatus = 'MENU'
  private stageStartedAt = 0
  private nextSpawnAt = 0
  private lastSnapshotAt = 0
  private totalKills = 0
  private stage = 1
  private phase: 'SURVIVAL' | 'BOSS' = 'SURVIVAL'
  private difficulty: HuntDifficulty = 'normal'
  private mode: HuntMode = 'SURVIVAL'
  private bossSpawned = false
  private bossHeartsRemaining = 0
  private localAim = [{ x: -0.32, y: 0.53 }, { x: 0.32, y: 0.53 }]
  private localFire = [false, false]
  private lastSnapshot: HuntSnapshot | null = null
  private pauseStartedAt = 0
  private keyMap: Record<string, Phaser.Input.Keyboard.Key> = {}
  private debugEnabled = false

  constructor() {
    super('HuntScene')
  }

  preload() {
    for (let stage = 1; stage <= 5; stage += 1) {
      this.load.image(`stage-background-${stage}`, `/games/control-2d-2players/bg-${stage}.png`)
    }
    this.load.image('weapon-cannon', '/games/control-2d-2players/weapon-cannon.png')
    this.load.image('weapon-ice', '/games/control-2d-2players/weapon-ice.png')
    this.load.image('player-blue', '/games/control-2d-2players/player-blue.png')
    this.load.image('player-pink', '/games/control-2d-2players/player-pink.png')
    ENEMY_TYPES.forEach((type) => {
      const spec = ENEMY_SPECS[type]
      const path = `/games/control-2d-2players/${spec.file}.png`
      if (spec.frameRects) this.load.image(type, path)
      else this.load.spritesheet(type, path, { frameWidth: spec.frameWidth, frameHeight: spec.frameHeight })
    })
    this.load.audio('bullet-bomb', '/games/control-2d-2players/voices/bullet-bomb.mp3')
    this.load.audio('bullet-bubble', '/games/control-2d-2players/voices/bullet-bubble.mp3')
  }

  create() {
    ENEMY_TYPES.forEach((type) => {
      const spec = ENEMY_SPECS[type]
      if (spec.frameRects) {
        const texture = this.textures.get(type)
        spec.frameRects.forEach(({ x, y, width, height }, index) => {
          texture.add(index, 0, x, y, width, height)
        })
      }
      this.anims.create({
        key: `${type}-move`,
        frames: this.anims.generateFrameNumbers(type, { frames: spec.moveFrames }),
        frameRate: spec.frameRate,
        repeat: -1,
      })
      if (spec.attackFrames?.length) {
        this.anims.create({
          key: `${type}-attack`,
          frames: this.anims.generateFrameNumbers(type, { frames: spec.attackFrames }),
          frameRate: Math.max(7, spec.frameRate),
          repeat: 0,
        })
      }
    })
    this.background = this.add.image(WIDTH / 2, HEIGHT / 2, 'stage-background-1').setDepth(0)
    this.fitBackgroundToStage()
    this.depth = this.add.graphics().setDepth(23)
    this.enemyDebugGraphics = this.add.graphics().setDepth(25)
    this.players = [this.createPlayer(1), this.createPlayer(2)]
    this.playerSprites = [
      this.add.image(185, 1100, 'player-blue').setOrigin(0.5, 1).setDisplaySize(440, 368).setDepth(30),
      this.add.image(1735, 1100, 'player-pink').setOrigin(0.5, 1).setDisplaySize(440, 379).setDepth(30),
    ]
    this.crosshairs = [
      this.add.graphics().setDepth(24),
      this.add.graphics().setDepth(24),
    ]
    this.createCanopy()
    this.events.emit('ready')
    this.onReady?.()

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.localAim[0] = { x: clamp((pointer.x / WIDTH) * 2 - 1, -1, 1), y: clamp((pointer.y - 250) / 560, 0, 1) }
    })
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.gameStatus === 'PLAYING') this.localFire[0] = true
    })
    this.input.on('pointerup', () => { this.localFire[0] = false })
    this.input.on('gameout', () => { this.localFire[0] = false })
    if (this.input.keyboard) {
      this.keyMap = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,I,J,K,L,ENTER,Q,E,SPACE,Z,X,N,M') as Record<string, Phaser.Input.Keyboard.Key>
      this.input.keyboard.on('keydown-Q', () => this.useAbility(1, 0))
      this.input.keyboard.on('keydown-E', () => this.useAbility(2, 1))
      this.input.keyboard.on('keydown-Z', () => this.activateWeapon(1, 'cannon'))
      this.input.keyboard.on('keydown-X', () => this.activateWeapon(1, 'ice'))
      this.input.keyboard.on('keydown-N', () => this.activateWeapon(2, 'cannon'))
      this.input.keyboard.on('keydown-M', () => this.activateWeapon(2, 'ice'))
      this.input.keyboard.on('keydown-F3', () => {
        if (!DEV_TEST) return
        this.debugEnabled = !this.debugEnabled
        this.enemies.forEach((enemy) => enemy.debugLabel?.setVisible(this.debugEnabled))
        if (!this.debugEnabled) this.enemyDebugGraphics.clear()
      })
      this.input.keyboard.on('keydown-SPACE', () => this.localFire[0] = true)
      this.input.keyboard.on('keyup-SPACE', () => this.localFire[0] = false)
    }
    this.emitSnapshot(true)
  }

  private createPlayer(playerId: 1 | 2): PlayerState {
    return {
      playerId,
      hp: MAX_PLAYER_HEARTS,
      health: PLAYER_HEALTH_PER_HEART,
      maxHealth: PLAYER_HEALTH_PER_HEART,
      score: 0,
      kills: 0,
      ammo: MAGAZINE_SIZE,
      maxAmmo: MAGAZINE_SIZE,
      combo: 0,
      connected: false,
      reloadRemaining: 0,
      abilityCooldowns: [0, 0],
      weaponMode: null,
      weaponRemaining: 0,
      weaponInventory: { cannon: 0, ice: 0 },
      weaponExpiresAt: 0,
      invulnerableUntil: 0,
      hitFlashUntil: 0,
      aimX: playerId === 1 ? -0.32 : 0.32,
      aimY: 0.53,
      fire: false,
      nextShotAt: 0,
      reloadAt: 0,
      abilityReadyAt: [0, 0],
      lastKillAt: 0,
    }
  }

  private createCanopy() {
    const canopy = this.add.graphics().setDepth(3)
    canopy.fillStyle(0x082617, 0.3)
    canopy.fillEllipse(-32, -20, 440, 300)
    canopy.fillEllipse(1945, -10, 500, 310)
    canopy.lineStyle(29, 0x1e542e, 0.7)
    canopy.beginPath(); canopy.moveTo(6, 120); canopy.lineTo(120, 13); canopy.lineTo(192, -20); canopy.strokePath()
    canopy.beginPath(); canopy.moveTo(1905, 170); canopy.lineTo(1810, 34); canopy.lineTo(1777, -20); canopy.strokePath()
    for (let i = 0; i < 18; i += 1) {
      const side = i % 2 === 0 ? 1 : -1
      const x = side > 0 ? Phaser.Math.Between(22, 310) : Phaser.Math.Between(1610, 1895)
      const y = Phaser.Math.Between(0, 170)
      canopy.fillStyle(i % 3 ? 0x39873c : 0x71aa43, 0.75)
      canopy.fillEllipse(x, y, Phaser.Math.Between(45, 106), Phaser.Math.Between(21, 43))
    }
  }

  setControllerInput(playerId: 1 | 2, input: RemoteHuntInput | null) {
    const player = this.players[playerId - 1]
    player.connected = Boolean(input)
    if (input) {
      player.aimX = clamp(input.aimX, -1, 1)
      player.aimY = clamp((1 - input.aimY) / 2, 0, 1)
      player.fire = this.gameStatus === 'PLAYING' && input.fire
    } else {
      player.fire = false
    }
    this.emitSnapshot(false)
  }

  setControllerConnection(playerId: 1 | 2, connected: boolean) {
    this.players[playerId - 1].connected = connected
    if (!connected) this.players[playerId - 1].fire = false
    this.emitSnapshot(true)
  }

  startRun(difficulty: HuntDifficulty = this.difficulty, mode: HuntMode = this.mode) {
    this.tweens.resumeAll()
    this.anims.resumeAll()
    const connected = this.players.map((player) => player.connected) as [boolean, boolean]
    this.difficulty = difficulty
    this.mode = mode
    this.totalKills = 0
    this.traces = []
    this.players = [this.createPlayer(1), this.createPlayer(2)]
    this.playerSprites.forEach((sprite, index) => {
      this.tweens.killTweensOf(sprite)
      sprite.clearTint().setPosition(index === 0 ? 185 : 1735, 1100).setRotation(0)
        .setDisplaySize(440, index === 0 ? 368 : 379)
    })
    this.players.forEach((player, index) => { player.connected = connected[index] })
    this.localFire = [false, false]
    this.beginStage(1)
  }

  advanceStage(): Promise<void> {
    if (this.gameStatus === 'WON') this.beginStage(this.stage + 1)
    return Promise.resolve()
  }

  private beginStage(stage: number) {
    this.clearEnemies()
    this.clearPickups()
    this.traces = []
    this.stage = stage
    this.bossHeartsRemaining = 0
    this.setStageBackground(stage)
    this.phase = 'SURVIVAL'
    this.bossSpawned = false
    this.stageStartedAt = this.time.now
    this.nextSpawnAt = this.stageStartedAt + 250
    this.players.forEach((player) => {
      player.ammo = MAGAZINE_SIZE
      player.reloadAt = 0
      player.reloadRemaining = 0
      player.fire = false
    })
    this.gameStatus = 'PLAYING'
    this.localFire = [false, false]
    if (this.mode === 'BOSS_TEST') this.spawnBoss()
    else this.emitSnapshot(true)
  }

  private setStageBackground(stage: number) {
    const backgroundStage = ((stage - 1) % 5) + 1
    this.background.setTexture(`stage-background-${backgroundStage}`)
    this.fitBackgroundToStage()
  }

  private fitBackgroundToStage() {
    this.background.setPosition(WIDTH / 2, HEIGHT / 2)
      .setScale(Math.max(WIDTH / this.background.width, HEIGHT / this.background.height))
  }

  pauseRun() {
    if (this.gameStatus !== 'PLAYING') return
    this.gameStatus = 'PAUSED'
    this.pauseStartedAt = this.time.now
    this.tweens.pauseAll()
    this.anims.pauseAll()
    this.players.forEach((player) => { player.fire = false })
    this.localFire = [false, false]
    this.emitSnapshot(true)
  }

  resumeRun() {
    if (this.gameStatus !== 'PAUSED') return
    const pausedFor = this.time.now - this.pauseStartedAt
    this.stageStartedAt += pausedFor
    this.nextSpawnAt += pausedFor
    this.players.forEach((player) => {
      if (player.reloadAt > 0) player.reloadAt += pausedFor
      player.abilityReadyAt = player.abilityReadyAt.map((readyAt) => readyAt > 0 ? readyAt + pausedFor : 0) as [number, number]
      player.nextShotAt += pausedFor
      if (player.weaponMode) player.weaponExpiresAt += pausedFor
      player.invulnerableUntil += player.invulnerableUntil > 0 ? pausedFor : 0
      player.hitFlashUntil += player.hitFlashUntil > 0 ? pausedFor : 0
    })
    this.enemies.forEach((enemy) => {
      enemy.stateStartedAt += pausedFor
      enemy.spawnedAt += pausedFor
      enemy.patternChangeAt += pausedFor
      enemy.nextDirectionChangeAt += pausedFor
      enemy.sideStepStartedAt += pausedFor
      enemy.attackReadyAt += pausedFor
      enemy.frozenUntil += enemy.frozenUntil > 0 ? pausedFor : 0
      enemy.frozenStartedAt += enemy.frozenStartedAt > 0 ? pausedFor : 0
      enemy.image.anims.resume()
    })
    this.tweens.resumeAll()
    this.anims.resumeAll()
    this.gameStatus = 'PLAYING'
    this.emitSnapshot(true)
  }

  useAbility(playerId: 1 | 2, ability: 0 | 1) {
    if (this.gameStatus !== 'PLAYING') return
    const player = this.players[playerId - 1]
    if (this.time.now < player.abilityReadyAt[ability]) return
    player.abilityReadyAt[ability] = this.time.now + 10_000
    if (ability === 0) {
      this.enemies.filter((enemy) => enemy.aiState !== 'DEAD').slice().sort((a, b) => b.progress - a.progress).slice(0, 3).forEach((enemy) => this.hitEnemy(enemy, playerId, SHOT_DAMAGE * 2))
      this.addBurst(playerId === 1 ? 680 : 1240, 520, PLAYER_COLORS[playerId])
    } else {
      const freezeUntil = this.time.now + 2200
      this.enemies.forEach((enemy) => {
        if (enemy.aiState === 'DEAD') return
        enemy.frozenUntil = freezeUntil
        enemy.frozenStartedAt = this.time.now
        enemy.image.setTint(0x83e7ff)
      })
      this.addBurst(960, 510, 0x76e7ff)
    }
    this.emitSnapshot(true)
  }

  activateWeapon(playerId: 1 | 2, weaponMode: WeaponMode) {
    if (this.gameStatus !== 'PLAYING') return
    const player = this.players[playerId - 1]
    if (player.hp <= 0 || player.weaponInventory[weaponMode] <= 0) return
    if (player.weaponMode && this.time.now < player.weaponExpiresAt) return
    player.weaponInventory[weaponMode] -= 1
    player.weaponMode = weaponMode
    player.weaponExpiresAt = this.time.now + WEAPON_DURATION_MS
    player.weaponRemaining = WEAPON_DURATION_MS
    this.emitSnapshot(true)
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50)
    this.depth.clear()
    this.drawShots(time)
    this.updateCrosshairs()
    if (this.gameStatus !== 'PLAYING') {
      this.emitSnapshot(time - this.lastSnapshotAt > 250)
      return
    }

    this.syncLocalInput()
    this.updatePlayers(time)
    this.updatePickups(time)
    if (!this.bossSpawned && time - this.stageStartedAt >= SURVIVAL_DURATION_MS) this.spawnBoss()
    if (this.bossHeartsRemaining === 0 && (this.phase === 'SURVIVAL' || this.phase === 'BOSS') && time >= this.nextSpawnAt) {
      const activeMinions = this.enemies.filter((enemy) => !enemy.isBoss && enemy.aiState !== 'DEAD').length
      const maxMinions = this.phase === 'BOSS' ? MAX_ACTIVE_BOSS_MINIONS : MAX_ACTIVE_ENEMIES
      if (activeMinions < maxMinions) this.spawnEnemy()
      const interval = this.phase === 'BOSS' ? getBossMinionSpawnInterval(this.stage) : getSurvivalSpawnInterval(this.stage)
      this.nextSpawnAt = time + interval
    }
    this.updateEnemies(time, dt)
    if (this.players[0].hp <= 0 && this.players[1].hp <= 0) this.finish('LOST')
    this.emitSnapshot(time - this.lastSnapshotAt >= 140)
  }

  private syncLocalInput() {
    if (!DEV_TEST) return
    const keyboard = this.keyMap
    if (keyboard.UP?.isDown) this.localAim[0].y = clamp(this.localAim[0].y - 0.012, 0, 1)
    if (keyboard.DOWN?.isDown) this.localAim[0].y = clamp(this.localAim[0].y + 0.012, 0, 1)
    if (keyboard.LEFT?.isDown) this.localAim[0].x = clamp(this.localAim[0].x - 0.012, -1, 1)
    if (keyboard.RIGHT?.isDown) this.localAim[0].x = clamp(this.localAim[0].x + 0.012, -1, 1)
    if (keyboard.J?.isDown) this.localAim[1].x = clamp(this.localAim[1].x - 0.012, -1, 1)
    if (keyboard.L?.isDown) this.localAim[1].x = clamp(this.localAim[1].x + 0.012, -1, 1)
    if (keyboard.I?.isDown) this.localAim[1].y = clamp(this.localAim[1].y - 0.012, 0, 1)
    if (keyboard.K?.isDown) this.localAim[1].y = clamp(this.localAim[1].y + 0.012, 0, 1)
    if (keyboard.ENTER?.isDown) this.localFire[1] = true
    else this.localFire[1] = false
    this.players.forEach((player, index) => {
      if (!player.connected) {
        player.aimX = this.localAim[index].x
        player.aimY = this.localAim[index].y
        player.fire = this.localFire[index] || index === 0 && Boolean(keyboard.SPACE?.isDown)
      }
    })
  }

  private updatePlayers(time: number) {
    for (const player of this.players) {
      player.reloadRemaining = player.reloadAt > time ? player.reloadAt - time : 0
      player.abilityCooldowns = player.abilityReadyAt.map((readyAt) => Math.max(0, readyAt - time)) as [number, number]
      player.weaponRemaining = Math.max(0, player.weaponExpiresAt - time)
      if (player.hitFlashUntil > 0 && time >= player.hitFlashUntil) {
        this.playerSprites[player.playerId - 1].clearTint()
        player.hitFlashUntil = 0
      }
      if (player.weaponRemaining <= 0) player.weaponMode = null
      if (player.reloadAt > 0 && time >= player.reloadAt) {
        player.ammo = MAGAZINE_SIZE
        player.reloadAt = 0
        player.reloadRemaining = 0
      }
      if (player.fire && player.hp > 0 && player.reloadAt <= time && time >= player.nextShotAt) this.fireShot(player, time)
    }
  }

  private fireShot(player: PlayerState, time: number) {
    player.nextShotAt = time + (player.weaponMode === 'cannon' ? CANNON_FIRE_RATE_MS : FIRE_RATE_MS)
    player.ammo = Math.max(0, player.ammo - 1)
    this.animatePlayerRecoil(player, time)
    this.sound.play(player.playerId === 1 ? 'bullet-bomb' : 'bullet-bubble', { volume: 0.38 })
    const aimX = (player.aimX + 1) * WIDTH / 2
    const aimY = 250 + player.aimY * 560
    let hit = false
    const heartIndex = this.heartPickups.findIndex((pickup) => Math.abs(aimX - pickup.x) < 52 && Math.abs(aimY - pickup.y) < 58)
    const weaponIndex = heartIndex < 0 ? this.weaponPickups.findIndex((pickup) => Math.abs(aimX - pickup.x) < 58 && Math.abs(aimY - pickup.y) < 64) : -1
    if (heartIndex >= 0) {
      hit = true
      this.collectHeart(heartIndex, player)
    } else if (weaponIndex >= 0) {
      hit = true
      this.collectWeapon(weaponIndex, player)
    }
    const candidate = heartIndex < 0 && weaponIndex < 0 ? this.enemies.filter((enemy) => enemy.aiState !== 'DEAD').sort((a, b) => b.isBoss ? 1 : a.isBoss ? -1 : b.progress - a.progress).find((enemy) => {
      const width = enemy.image.displayWidth
      const height = enemy.image.displayHeight
      return Math.abs(aimX - enemy.image.x) < width * 0.32 + 18 && Math.abs(aimY - enemy.image.y) < height * 0.29 + 20
    }) : undefined
    if (candidate) {
      hit = true
      this.hitEnemy(candidate, player.playerId, SHOT_DAMAGE * (player.weaponMode === 'ice' ? 2 : 1))
      this.addBurst(aimX, aimY, player.weaponMode === 'ice' ? 0x81e9ff : 0xffd373)
    }
    this.traces.push({ playerId: player.playerId, aimX, aimY, expiresAt: time + 95, hit, weaponMode: player.weaponMode })
    if (player.ammo === 0) player.reloadAt = time + RELOAD_MS
  }

  private animatePlayerRecoil(player: PlayerState, time: number) {
    if (time < player.hitFlashUntil) return
    const sprite = this.playerSprites[player.playerId - 1]
    const baseX = player.playerId === 1 ? 185 : 1735
    const recoilDirection = player.playerId === 1 ? -1 : 1
    this.tweens.killTweensOf(sprite)
    sprite.setPosition(baseX, 1100).setRotation(0)
    this.tweens.add({
      targets: sprite,
      x: baseX + recoilDirection * 10,
      y: 1103,
      rotation: recoilDirection * 0.025,
      duration: 42,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => sprite.setPosition(baseX, 1100).setRotation(0),
    })
  }

  private chooseEnemyTypeForStage(): EnemyType {
    const stageIndex = Math.min(ENEMY_UNLOCK_GROUPS.length - 1, Math.max(0, Math.floor(this.stage) - 1))
    const currentStageTypes = ENEMY_UNLOCK_GROUPS[stageIndex] ?? ENEMY_UNLOCK_GROUPS[0] ?? ['boar']
    const previousStageTypes = stageIndex > 0 ? ENEMY_UNLOCK_GROUPS[stageIndex - 1] ?? [] : []
    const olderStageTypes = stageIndex > 1 ? ENEMY_UNLOCK_GROUPS.slice(0, stageIndex - 1).flat() : []
    const groups = [
      { types: currentStageTypes, weight: 45 },
      { types: previousStageTypes, weight: 35 },
      { types: olderStageTypes, weight: 20 },
    ].filter((group) => group.types.length > 0)
    const totalWeight = groups.reduce((sum, group) => sum + group.weight, 0)
    let roll = Phaser.Math.Between(1, totalWeight)
    for (const group of groups) {
      if (roll <= group.weight) {
        return group.types[Phaser.Math.Between(0, group.types.length - 1)] ?? currentStageTypes[0] ?? 'boar'
      }
      roll -= group.weight
    }
    return currentStageTypes[0] ?? 'boar'
  }

  private spawnEnemy() {
    const type = this.chooseEnemyTypeForStage()
    const spec = ENEMY_SPECS[type]
    const isSpider = type === 'nhen'
    const lane = isSpider ? Phaser.Math.FloatBetween(-1, 1) : 0
    const zone = Phaser.Math.Between(0, 2)
    const zoneBounds = zone === 0 ? [110, 615] : zone === 1 ? [645, 1275] : [1305, 1810]
    const spawnX = isSpider
      ? WIDTH / 2 + lane * Phaser.Math.Between(70, 385)
      : Phaser.Math.Between(zoneBounds[0], zoneBounds[1])
    const homeX = spawnX
    const isHanging = type === 'nhen' && Phaser.Math.Between(0, 1) === 1
    const airLift = isSpider && isHanging ? 80 : 0
    const tier = ENEMY_SIZE_TIERS[Phaser.Math.Between(0, ENEMY_SIZE_TIERS.length - 1)] ?? ENEMY_SIZE_TIERS[2]
    const scaledHealth = Math.max(1, Math.round(tier.health * DIFFICULTY_HEALTH[this.difficulty]))
    const initialSize = 70 * tier.scale
    const spawnCategory = spec.movement.spawnCategory
    const now = this.time.now
    const startY = isSpider ? 326 - airLift : spawnCategory === 'FLYING'
      ? HEIGHT * Phaser.Math.FloatBetween(0.1, 0.45)
      : HEIGHT * Phaser.Math.FloatBetween(0.55, 0.65)
    const goalY = isSpider ? 774 : spawnCategory === 'FLYING' ? HEIGHT * 0.53 : HEIGHT * 0.84
    const groundY = isSpider ? 337 : spawnCategory === 'FLYING'
      ? Math.max(startY + 95, HEIGHT * 0.46)
      : startY + initialSize * 0.25
    const targetPlayerId = homeX < WIDTH / 2 ? 1 : 2
    const enemyPattern: MovementPattern | null = isSpider
      ? null
      : Phaser.Math.Between(0, 2) === 0
        ? 'DIRECT'
        : Phaser.Math.Between(0, 1) === 0 ? 'ZIGZAG' : 'DIAGONAL'
    const image = this.add.sprite(spawnX, startY, type, 0).setOrigin(0.5, spawnCategory === 'FLYING' || isHanging ? 0.5 : 0.78)
    image.setDisplaySize(initialSize * image.frame.width / image.frame.height, initialSize).setDepth(12)
    image.play(`${type}-move`)
    const shadow = this.add.ellipse(spawnX, groundY, initialSize * 0.4, initialSize * 0.14, 0x18301d, spawnCategory === 'FLYING' ? 0.2 : 0.45).setDepth(10)
    const healthBar = this.add.graphics().setDepth(23)
    const tether = isHanging ? this.add.graphics().setDepth(11) : null
    const movementConfig = spec.movement
    const debugLabel = DEV_TEST ? this.add.text(spawnX, startY - initialSize * 0.6, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', stroke: '#101812', strokeThickness: 4, backgroundColor: '#101812bb', padding: { x: 5, y: 3 } }).setOrigin(0.5, 1).setDepth(25).setVisible(this.debugEnabled) : null
    this.enemies.push({
      enemyId: this.nextEnemyId++, type, image, shadow, healthBar, tether, health: scaledHealth, maxHealth: scaledHealth,
      sizeScale: tier.scale,
      attackDamage: isSpider ? tier.attackDamage : Math.max(1, Math.round(tier.attackDamage * movementConfig.attackDamage / 30)),
      progress: 0, homeX, lane, travelMs: Phaser.Math.Between(4900, 6700), frozenUntil: 0,
      isBoss: false, attackReadyAt: isSpider ? 0 : now + Phaser.Math.Between(650, 1250), airLift,
      spawnCategory, aiState: isSpider ? 'APPROACH' : 'SPAWN', stateStartedAt: now, spawnedAt: now, targetPlayerId,
      pattern: enemyPattern,
      movementDirection: Phaser.Math.Between(0, 1) === 0 ? -1 : 1,
      directionChangeMs: Phaser.Math.Between(620, 1380), nextDirectionChangeAt: now + Phaser.Math.Between(620, 1380),
      patternPhase: Phaser.Math.FloatBetween(0, Math.PI * 2), patternChangeAt: now + Phaser.Math.Between(4400, 7200),
      patternStartedAt: now, patternStartX: spawnX, patternTargetX: spawnX,
      sideStepStartedAt: now, spawnX, startY, goalY, approachY: startY, bodyY: startY, groundY, currentX: spawnX,
      attackStartX: spawnX, attackStartY: startY, attackStartGroundY: groundY,
      attackEndX: spawnX, attackEndY: startY, attackEndGroundY: groundY, attackHasHit: false, despawnAfterAttack: false, attackFromDistance: false,
      windupDuration: Math.round(movementConfig.windupDuration * Phaser.Math.FloatBetween(0.82, 1.2)),
      frozenStartedAt: 0, resumeStateAfterHit: 'APPROACH',
      deathScaleX: image.scaleX, deathScaleY: image.scaleY, deathRotation: 0, debugLabel,
    })
  }

  private spawnBoss() {
    this.bossSpawned = true
    this.phase = 'BOSS'
    this.nextSpawnAt = this.time.now + getBossMinionSpawnInterval(this.stage)
    this.clearEnemies()
    const type: EnemyState['type'] = this.stage % 2 === 1 ? 'boar' : 'bat'
    const spec = ENEMY_SPECS[type]
    const airLift = spec.airborne ? 40 : 0
    const homeX = WIDTH / 2
    const startY = (spec.airborne ? 585 : 625) - airLift
    const groundY = startY + 25
    const healthPair = BOSS_HEALTH[this.difficulty]
    const baseHealth = this.stage % 2 === 1 ? healthPair[0] : healthPair[1]
    const maxHealth = Math.round(baseHealth * 1.08 ** Math.max(0, this.stage - 2))
    const initialBossHeight = 210 * 1.5
    const image = this.add.sprite(homeX, startY, type, 0).setOrigin(0.5, airLift ? 0.5 : 0.78)
    image.setDisplaySize(initialBossHeight * image.frame.width / image.frame.height, initialBossHeight).setDepth(20)
    image.play(`${type}-move`)
    const shadow = this.add.ellipse(homeX, groundY + 78, 150, 34, 0x18301d, 0.45).setDepth(18)
    const healthBar = this.add.graphics().setDepth(23)
    const debugLabel = DEV_TEST ? this.add.text(homeX, startY - initialBossHeight * 0.65, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', stroke: '#101812', strokeThickness: 4, backgroundColor: '#101812bb', padding: { x: 5, y: 3 } }).setOrigin(0.5, 1).setDepth(25).setVisible(this.debugEnabled) : null
    const attackDamage = this.difficulty === 'easy' ? 22 : this.difficulty === 'normal' ? 32 : 42
    const now = this.time.now
    this.enemies.push({
      enemyId: this.nextEnemyId++, type, image, shadow, healthBar, tether: null, health: maxHealth, maxHealth, sizeScale: 1.5, attackDamage,
      progress: 0, homeX, lane: 0, travelMs: 9800, frozenUntil: 0, isBoss: true, attackReadyAt: now + 1800, airLift,
      spawnCategory: spec.movement.spawnCategory, aiState: 'APPROACH', stateStartedAt: now, spawnedAt: now,
      targetPlayerId: this.chooseBalancedTarget(), pattern: 'DIRECT', movementDirection: 1, directionChangeMs: 1000,
      nextDirectionChangeAt: now + 1000, patternPhase: Phaser.Math.FloatBetween(0, Math.PI * 2), patternChangeAt: now + Phaser.Math.Between(1600, 2400),
      patternStartedAt: now, patternStartX: homeX, patternTargetX: homeX, sideStepStartedAt: now,
      spawnX: homeX, startY, goalY: 850, approachY: startY, bodyY: startY, groundY, currentX: homeX,
      attackStartX: homeX, attackStartY: startY, attackStartGroundY: groundY,
      attackEndX: homeX, attackEndY: startY, attackEndGroundY: groundY, attackHasHit: false, despawnAfterAttack: false,
      attackFromDistance: Phaser.Math.Between(0, 100) < 35, windupDuration: 430,
      frozenStartedAt: 0, resumeStateAfterHit: 'APPROACH', deathScaleX: image.scaleX, deathScaleY: image.scaleY,
      deathRotation: 0, debugLabel,
    })
    for (let index = 0; index < MAX_ACTIVE_BOSS_MINIONS; index += 1) this.spawnEnemy()
    this.emitSnapshot(true)
  }

  private updateEnemies(time: number, deltaMs: number) {
    this.enemyDebugGraphics.clear()
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index]
      if (enemy.aiState === 'DEAD') {
        this.updateDeadEnemy(index, enemy, time)
        continue
      }
      if (time < enemy.frozenUntil) {
        enemy.image.setTint(0x83e7ff)
        continue
      }
      this.shiftEnemyTimersAfterFreeze(enemy, time)
      if (enemy.aiState === 'HIT_REACTION') {
        enemy.image.setTint(0xffc0b7)
        if (time - enemy.stateStartedAt >= 145) {
          if (enemy.despawnAfterAttack) {
            this.setEnemyState(enemy, 'DEAD', time)
            this.updateDeadEnemy(index, enemy, time)
            continue
          }
          this.setEnemyState(enemy, enemy.resumeStateAfterHit, time)
          if (enemy.resumeStateAfterHit === 'RECOVERY') {
            enemy.attackStartX = enemy.currentX
            enemy.attackStartY = enemy.bodyY
            enemy.attackStartGroundY = enemy.groundY
            enemy.attackEndX = enemy.currentX
            enemy.attackEndY = enemy.bodyY
            enemy.attackEndGroundY = enemy.groundY
          }
        }
      }

      if (enemy.isBoss) {
        this.updateBossEnemy(enemy, time, deltaMs)
        const size = (210 + enemy.progress * 180) * enemy.sizeScale
        this.renderEnemy(enemy, time, size)
        this.updateEnemyDebug(enemy, time, size)
        continue
      }

      if (enemy.spawnCategory === 'SPECIAL') {
        enemy.progress = Math.min(1, enemy.progress + deltaMs / enemy.travelMs)
        const size = (70 + enemy.progress * 300) * enemy.sizeScale
        enemy.currentX = enemy.homeX + Math.sin(time / 370 + enemy.lane * 4) * (8 + enemy.progress * 22)
        enemy.groundY = 326 + enemy.progress * 448
        enemy.bodyY = enemy.groundY - enemy.airLift + (enemy.airLift ? Math.sin(time / 210 + enemy.lane * 5) * 18 : 0)
        this.renderEnemy(enemy, time, size)
        if (enemy.progress >= 1) {
          const target = this.getEnemyTarget(enemy)
          if (target) {
            const didDamage = this.damagePlayer(target, enemy.attackDamage, target.playerId === 1 ? 260 : 1660, 865)
            if (!didDamage) this.addBurst(enemy.currentX, enemy.bodyY, PLAYER_COLORS[target.playerId])
          }
          this.removeEnemy(index)
          continue
        }
        this.updateEnemyDebug(enemy, time, size)
        continue
      }

      this.updateTacticalEnemy(enemy, time, deltaMs)
      const size = (70 + enemy.progress * 300) * enemy.sizeScale
      this.renderEnemy(enemy, time, size)
      this.updateEnemyDebug(enemy, time, size)
    }
  }

  private updateBossEnemy(enemy: EnemyState, time: number, deltaMs: number) {
    if (enemy.aiState === 'HIT_REACTION' || enemy.aiState === 'DEAD') return
    const config = ENEMY_SPECS[enemy.type].movement
    const elapsed = time - enemy.stateStartedAt
    const dt = Math.min(deltaMs, 50) / 1000
    const size = (210 + enemy.progress * 180) * enemy.sizeScale
    const margin = Math.min(WIDTH * 0.18, size * 0.55)

    if (enemy.aiState === 'APPROACH') {
      if (time >= enemy.patternChangeAt) {
        const availablePatterns: MovementPattern[] = ['DIRECT', 'DIAGONAL', 'ZIGZAG']
        const patterns = availablePatterns.filter((pattern) => pattern !== enemy.pattern)
        enemy.pattern = patterns[Phaser.Math.Between(0, patterns.length - 1)] ?? 'DIRECT'
        enemy.patternStartedAt = time
        enemy.patternStartX = enemy.currentX
        enemy.patternTargetX = enemy.pattern === 'DIAGONAL'
          ? enemy.currentX < WIDTH / 2 ? WIDTH - margin : margin
          : enemy.currentX
        enemy.patternPhase = Phaser.Math.FloatBetween(0, Math.PI * 2)
        enemy.patternChangeAt = time + Phaser.Math.Between(1800, 2900)
      }

      enemy.approachY = Math.min(enemy.goalY, enemy.approachY + config.approachSpeed * 0.92 * dt)
      enemy.progress = clamp((enemy.approachY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 0.92)
      enemy.bodyY = enemy.approachY + (enemy.airLift ? Math.sin(time / 210 + enemy.patternPhase) * 14 : 0)
      enemy.groundY = enemy.bodyY + 24 + enemy.progress * 30

      const phaseDuration = Math.max(1, enemy.patternChangeAt - enemy.patternStartedAt)
      const phaseProgress = clamp((time - enemy.patternStartedAt) / phaseDuration, 0, 1)
      if (enemy.pattern === 'DIAGONAL') {
        enemy.currentX = lerp(enemy.patternStartX, enemy.patternTargetX, phaseProgress)
      } else if (enemy.pattern === 'ZIGZAG') {
        enemy.currentX = enemy.patternStartX + Math.sin((time - enemy.patternStartedAt) / 430 + enemy.patternPhase) * Math.min(230, config.zigzagAmplitude * 2.1)
      } else {
        enemy.currentX = enemy.patternStartX
      }
      enemy.currentX = clamp(enemy.currentX, margin, WIDTH - margin)

      const canAttack = time >= enemy.attackReadyAt
      const attackDepth = enemy.attackFromDistance ? 0.3 : 0.64
      if (canAttack && enemy.progress >= attackDepth) {
        const target = this.getEnemyTarget(enemy)
        if (target) {
          enemy.targetPlayerId = target.playerId
          enemy.attackStartX = enemy.currentX
          enemy.attackStartY = enemy.bodyY
          enemy.attackStartGroundY = enemy.groundY
          enemy.attackHasHit = false
          enemy.windupDuration = Math.round(config.windupDuration * Phaser.Math.FloatBetween(0.88, 1.12))
          this.setEnemyState(enemy, 'WINDUP', time)
        }
      }
    } else if (enemy.aiState === 'WINDUP') {
      enemy.currentX = enemy.attackStartX
      enemy.bodyY = enemy.attackStartY - 10 * Math.min(1, elapsed / enemy.windupDuration)
      enemy.groundY = enemy.attackStartGroundY
      if (elapsed >= enemy.windupDuration) {
        enemy.attackStartX = enemy.currentX
        enemy.attackStartY = enemy.bodyY
        enemy.attackStartGroundY = enemy.groundY
        enemy.attackHasHit = false
        this.setEnemyState(enemy, 'ATTACK', time)
      }
    } else if (enemy.aiState === 'ATTACK') {
      const attackT = clamp(elapsed / config.attackDuration, 0, 1)
      const eased = 1 - (1 - attackT) ** 3
      const targetX = enemy.targetPlayerId === 1 ? WIDTH * 0.23 : WIDTH * 0.77
      const impactY = 925
      const jumpHeight = enemy.attackFromDistance ? 235 : 105
      enemy.currentX = lerp(enemy.attackStartX, targetX, eased)
      enemy.bodyY = lerp(enemy.attackStartY, impactY, eased) - Math.sin(attackT * Math.PI) * jumpHeight
      enemy.groundY = lerp(enemy.attackStartGroundY, 850, eased)
      enemy.progress = Math.max(enemy.progress, clamp((enemy.bodyY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 1))

      if (!enemy.attackHasHit && attackT >= 0.7) {
        enemy.attackHasHit = true
        const target = this.getEnemyTarget(enemy)
        if (target && this.enemyIntersectsHitbox(enemy, this.getAttackZone(target))) {
          const impactX = target.playerId === 1 ? 260 : 1660
          const didDamage = this.damagePlayer(target, enemy.attackDamage, impactX, 880)
          if (!didDamage) this.addBurst(impactX, 880, PLAYER_COLORS[target.playerId])
          enemy.targetPlayerId = this.chooseBalancedTarget()
        }
      }

      if (attackT >= 1) {
        enemy.attackEndX = enemy.currentX
        enemy.attackEndY = enemy.bodyY
        enemy.attackEndGroundY = enemy.groundY
        enemy.attackReadyAt = time + config.attackCooldown
        this.setEnemyState(enemy, 'RECOVERY', time)
      }
    } else if (enemy.aiState === 'RECOVERY') {
      const recoveryT = clamp(elapsed / config.recoveryDuration, 0, 1)
      const eased = recoveryT * recoveryT * (3 - 2 * recoveryT)
      enemy.currentX = lerp(enemy.attackEndX, enemy.attackStartX, eased)
      enemy.bodyY = lerp(enemy.attackEndY, enemy.attackStartY, eased)
      enemy.groundY = lerp(enemy.attackEndGroundY, enemy.attackStartGroundY, eased)
      enemy.progress = Math.max(enemy.progress, clamp((enemy.bodyY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 0.92))
      if (recoveryT >= 1) {
        enemy.approachY = enemy.bodyY
        this.setEnemyState(enemy, 'RETREAT', time)
      }
    } else if (enemy.aiState === 'RETREAT') {
      const retreatToY = enemy.startY + (enemy.goalY - enemy.startY) * 0.06
      const retreatSpeed = config.approachSpeed * 2.3
      const lateralSpeed = config.lateralSpeed * 2.5
      enemy.approachY = Math.max(retreatToY, enemy.approachY - retreatSpeed * dt)
      enemy.progress = clamp((enemy.approachY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 0.92)
      enemy.bodyY = enemy.approachY + (enemy.airLift ? Math.sin(time / 210 + enemy.patternPhase) * 14 : 0)
      enemy.groundY = enemy.bodyY + 24 + enemy.progress * 30
      enemy.currentX += clamp(enemy.homeX - enemy.currentX, -lateralSpeed * dt, lateralSpeed * dt)
      if (enemy.approachY <= retreatToY + 1 && Math.abs(enemy.homeX - enemy.currentX) <= lateralSpeed * dt + 1) {
        enemy.currentX = enemy.homeX
        enemy.attackFromDistance = Phaser.Math.Between(0, 100) < 35
        enemy.pattern = 'DIRECT'
        enemy.patternStartedAt = time
        enemy.patternStartX = enemy.homeX
        enemy.patternTargetX = enemy.homeX
        enemy.patternChangeAt = time + Phaser.Math.Between(700, 1300)
        this.setEnemyState(enemy, 'APPROACH', time)
      }
    }
  }

  private damagePlayer(player: PlayerState, damage: number, impactX = player.playerId === 1 ? 250 : 1670, impactY = 870) {
    const now = this.time.now
    if (player.hp <= 0 || now < player.invulnerableUntil) return false
    player.health = Math.max(0, player.health - damage)
    if (player.health <= 0) {
      player.hp = Math.max(0, player.hp - 1)
      if (player.hp > 0) player.health = player.maxHealth
    }
    player.invulnerableUntil = now + 1000
    this.reactToPlayerHit(player, impactX, impactY)
    return true
  }

  private reactToPlayerHit(player: PlayerState, impactX: number, impactY: number) {
    const sprite = this.playerSprites[player.playerId - 1]
    const pushDirection = player.playerId === 1 ? -1 : 1
    this.tweens.killTweensOf(sprite)
    sprite.setPosition(player.playerId === 1 ? 185 : 1735, 1100).setTintFill(0xff9b91)
    const baseScaleX = player.playerId === 1 ? 440 / sprite.width : 440 / sprite.width
    const baseScaleY = (player.playerId === 1 ? 368 : 379) / sprite.height
    sprite.setScale(baseScaleX, baseScaleY)
    player.hitFlashUntil = this.time.now + 260
    this.tweens.add({
      targets: sprite,
      x: sprite.x + pushDirection * 9,
      y: sprite.y + 4,
      scaleX: baseScaleX * 0.975,
      scaleY: baseScaleY * 0.975,
      rotation: pushDirection * 0.075,
      duration: 155,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => sprite.setPosition(player.playerId === 1 ? 185 : 1735, 1100).setScale(baseScaleX, baseScaleY).setRotation(0),
    })
    this.addBurst(impactX, impactY, 0xff8b76)
    this.cameras.main.shake(155, 0.0022)
  }

  private chooseBalancedTarget(): 1 | 2 {
    const alivePlayers = this.players.filter((player) => player.hp > 0)
    if (alivePlayers.length <= 1) return (alivePlayers[0]?.playerId ?? 1) as 1 | 2
    const counts: Record<1 | 2, number> = { 1: 0, 2: 0 }
    this.enemies.forEach((enemy) => {
      if (enemy.aiState !== 'DEAD' && this.players[enemy.targetPlayerId - 1]?.hp > 0) counts[enemy.targetPlayerId] += 1
    })
    const minimum = Math.min(...alivePlayers.map((player) => counts[player.playerId]))
    const candidates = alivePlayers.filter((player) => counts[player.playerId] === minimum)
    return candidates[Phaser.Math.Between(0, candidates.length - 1)]?.playerId ?? alivePlayers[0].playerId
  }

  private getEnemyTarget(enemy: EnemyState) {
    let target = this.players[enemy.targetPlayerId - 1]
    if (target && (target.hp > 0 || !enemy.isBoss)) return target
    target = this.players.find((player) => player.hp > 0) ?? target
    if (target) enemy.targetPlayerId = target.playerId
    return target?.hp > 0 ? target : undefined
  }

  private shiftEnemyTimersAfterFreeze(enemy: EnemyState, time: number) {
    if (enemy.frozenStartedAt <= 0) return
    const frozenFor = Math.max(0, time - enemy.frozenStartedAt)
    enemy.stateStartedAt += frozenFor
    enemy.spawnedAt += frozenFor
    enemy.patternChangeAt += frozenFor
    enemy.patternStartedAt += frozenFor
    enemy.nextDirectionChangeAt += frozenFor
    enemy.sideStepStartedAt += frozenFor
    enemy.attackReadyAt += frozenFor
    enemy.frozenStartedAt = 0
    if (enemy.aiState === 'HIT_REACTION') enemy.image.setTint(0xffc0b7)
    else enemy.image.clearTint()
  }

  private setEnemyState(enemy: EnemyState, state: EnemyAIState, time: number) {
    if (enemy.aiState === 'DEAD') return
    enemy.aiState = state
    enemy.stateStartedAt = time
    if (state === 'ATTACK' && enemy.spawnCategory !== 'SPECIAL' && ENEMY_SPECS[enemy.type].attackFrames?.length) {
      enemy.image.play(`${enemy.type}-attack`, true)
    } else if (state === 'HIT_REACTION') {
      enemy.image.play(`${enemy.type}-move`, true)
    } else if (state === 'RECOVERY' || state === 'RETREAT' || state === 'APPROACH' || state === 'CLOSE_IN') {
      enemy.image.play(`${enemy.type}-move`, true)
    } else if (state === 'DEAD') {
      enemy.image.stop()
      enemy.deathScaleX = enemy.image.scaleX
      enemy.deathScaleY = enemy.image.scaleY
      enemy.deathRotation = enemy.image.rotation
      enemy.debugLabel?.setVisible(false)
    }
  }

  private updateTacticalEnemy(enemy: EnemyState, time: number, deltaMs: number) {
    const config = ENEMY_SPECS[enemy.type].movement
    const target = this.getEnemyTarget(enemy)
    if (!target) return
    const elapsed = time - enemy.stateStartedAt
    const dt = Math.min(deltaMs, 50) / 1000

    if (enemy.aiState === 'HIT_REACTION') return
    if (enemy.aiState === 'SPAWN') {
      if (elapsed >= 320) this.setEnemyState(enemy, 'APPROACH', time)
    } else if (enemy.aiState === 'APPROACH') {
      this.advanceEnemyApproach(enemy, config, dt, 1, time)
      if (enemy.progress >= 0.63) this.setEnemyState(enemy, 'CLOSE_IN', time)
    } else if (enemy.aiState === 'CLOSE_IN') {
      if (time >= enemy.attackReadyAt || enemy.progress < 0.76) {
        this.advanceEnemyApproach(enemy, config, dt, 1.32, time)
      }
      if (elapsed >= config.closeInDuration && time >= enemy.attackReadyAt) {
        enemy.targetPlayerId = enemy.currentX < WIDTH / 2 ? 1 : 2
        enemy.attackStartX = enemy.currentX
        enemy.attackStartY = enemy.bodyY
        enemy.attackStartGroundY = enemy.groundY
        enemy.attackHasHit = false
        enemy.windupDuration = Math.round(config.windupDuration * Phaser.Math.FloatBetween(0.9, 1.12))
        this.setEnemyState(enemy, 'WINDUP', time)
      }
    } else if (enemy.aiState === 'WINDUP') {
      enemy.currentX = enemy.attackStartX
      enemy.bodyY = enemy.attackStartY - 7 * Math.min(1, elapsed / enemy.windupDuration)
      if (elapsed >= enemy.windupDuration) {
        enemy.attackStartX = enemy.currentX
        enemy.attackStartY = enemy.bodyY
        enemy.attackStartGroundY = enemy.groundY
        enemy.attackHasHit = false
        this.setEnemyState(enemy, 'ATTACK', time)
      }
    } else if (enemy.aiState === 'ATTACK') {
      const attackT = clamp(elapsed / config.attackDuration, 0, 1)
      const eased = 1 - (1 - attackT) ** 3
      const impactY = enemy.spawnCategory === 'FLYING' ? 870 : 920
      enemy.currentX = enemy.attackStartX
      enemy.bodyY = lerp(enemy.attackStartY, impactY, eased)
      enemy.groundY = enemy.spawnCategory === 'FLYING'
        ? lerp(enemy.attackStartGroundY, 935, eased)
        : enemy.bodyY + (70 + enemy.progress * 300) * enemy.sizeScale * 0.22
      enemy.progress = Math.max(enemy.progress, clamp((enemy.bodyY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 1))
      if (!enemy.attackHasHit && attackT >= 0.62) {
        enemy.attackHasHit = true
        const currentTarget = this.getEnemyTarget(enemy)
        if (currentTarget) {
          const bounds = this.getAttackZone(currentTarget)
          if (this.enemyIntersectsHitbox(enemy, bounds)) {
            enemy.despawnAfterAttack = true
            const didDamage = this.damagePlayer(currentTarget, enemy.attackDamage, currentTarget.playerId === 1 ? 260 : 1660, 880)
            if (!didDamage) this.addBurst(currentTarget.playerId === 1 ? 260 : 1660, 880, PLAYER_COLORS[currentTarget.playerId])
          }
        }
      }
      if (attackT >= 1) {
        enemy.attackEndX = enemy.currentX
        enemy.attackEndY = enemy.bodyY
        enemy.attackEndGroundY = enemy.groundY
        if (enemy.despawnAfterAttack) {
          this.setEnemyState(enemy, 'DEAD', time)
        } else {
          enemy.attackReadyAt = time + config.attackCooldown
          this.setEnemyState(enemy, 'RECOVERY', time)
        }
      }
    } else if (enemy.aiState === 'RECOVERY') {
      const recoveryT = clamp(elapsed / config.recoveryDuration, 0, 1)
      const eased = recoveryT * recoveryT * (3 - 2 * recoveryT)
      enemy.currentX = lerp(enemy.attackEndX, enemy.attackStartX, eased)
      enemy.bodyY = lerp(enemy.attackEndY, enemy.attackStartY, eased)
      enemy.groundY = lerp(enemy.attackEndGroundY, enemy.attackStartGroundY, eased)
      enemy.progress = Math.max(0.62, clamp((enemy.bodyY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 1))
      if (recoveryT >= 1) {
        enemy.bodyY = Math.max(enemy.startY, enemy.bodyY - 12)
        enemy.approachY = enemy.bodyY
        this.setEnemyState(enemy, 'APPROACH', time)
      }
    }
  }

  private advanceEnemyApproach(enemy: EnemyState, config: EnemyMovementConfig, dt: number, speedMultiplier: number, time: number) {
    const depthSpeed = config.approachSpeed * speedMultiplier
    enemy.approachY = Math.min(enemy.goalY, enemy.approachY + depthSpeed * dt)
    enemy.progress = clamp((enemy.approachY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 0.96)
    enemy.bodyY = enemy.approachY

    if (enemy.spawnCategory === 'FLYING') {
      enemy.groundY = Math.min(HEIGHT * 0.76, enemy.groundY + depthSpeed * 0.62 * dt)
    } else {
      enemy.groundY = enemy.bodyY + (70 + enemy.progress * 300) * enemy.sizeScale * 0.22
    }

    const size = (70 + enemy.progress * 300) * enemy.sizeScale
    const margin = Math.min(WIDTH * 0.16, size * 0.45 + 12)
    const elapsed = Math.max(0, time - enemy.spawnedAt)
    if (enemy.pattern === 'DIAGONAL') {
      const diagonalTargetX = enemy.spawnX < WIDTH / 2 ? WIDTH - margin : margin
      const diagonalProgress = clamp(enemy.progress / 0.82, 0, 1)
      enemy.currentX = clamp(lerp(enemy.spawnX, diagonalTargetX, diagonalProgress), margin, WIDTH - margin)
    } else {
      const sideLeft = enemy.targetPlayerId === 1 ? margin : WIDTH / 2
      const sideRight = enemy.targetPlayerId === 1 ? WIDTH / 2 : WIDTH - margin
      const zigzag = enemy.pattern === 'ZIGZAG'
        ? Math.sin(elapsed / Math.max(1, enemy.directionChangeMs) * Math.PI + enemy.patternPhase) * config.zigzagAmplitude
        : 0
      enemy.currentX = clamp(enemy.spawnX + zigzag, sideLeft, sideRight)
    }

    if (enemy.spawnCategory === 'FLYING') {
      enemy.bodyY = enemy.approachY
    }
  }

  private getAttackZone(player: PlayerState) {
    const splitX = WIDTH / 2
    return {
      left: player.playerId === 1 ? 0 : splitX,
      right: player.playerId === 1 ? splitX : WIDTH,
      top: 738,
      bottom: 1056,
    }
  }

  private enemyIntersectsHitbox(enemy: EnemyState, hitbox: ReturnType<HuntScene['getAttackZone']>) {
    const width = enemy.image.displayWidth
    const height = enemy.image.displayHeight
    const left = enemy.currentX - width / 2
    const right = enemy.currentX + width / 2
    const top = enemy.bodyY - height * enemy.image.originY
    const bottom = enemy.bodyY + height * (1 - enemy.image.originY)
    return left <= hitbox.right && right >= hitbox.left && top <= hitbox.bottom && bottom >= hitbox.top
  }

  private renderEnemy(enemy: EnemyState, time: number, size: number) {
    const x = enemy.currentX
    const y = enemy.bodyY
    const spec = ENEMY_SPECS[enemy.type]
    const bodyBob = enemy.isBoss || enemy.spawnCategory === 'SPECIAL' || enemy.aiState === 'WINDUP' || enemy.spawnCategory === 'FLYING' || enemy.pattern === 'HOP' ? 0 : Math.sin(time / 260 + enemy.patternPhase) * (1.5 + enemy.progress * 2)
    const lean = enemy.aiState === 'WINDUP' ? (enemy.targetPlayerId === 1 ? -0.055 : 0.055) : enemy.aiState === 'ATTACK' ? (enemy.targetPlayerId === 1 ? -0.11 : 0.11) : 0
    enemy.image.setPosition(x, y + bodyBob).setDisplaySize(size * enemy.image.frame.width / enemy.image.frame.height, size).setDepth(12 + Math.floor(enemy.progress * 10))
    if (enemy.aiState !== 'HIT_REACTION' && this.time.now >= enemy.frozenUntil) enemy.image.clearTint()
    const legacyRotation = enemy.isBoss || enemy.spawnCategory === 'SPECIAL' ? Math.sin(time / 260 + enemy.lane * 3) * (0.025 + enemy.progress * 0.04) : 0
    enemy.image.setRotation(legacyRotation + lean + (spec.airborne || enemy.pattern === 'FLYING_SWOOP' ? Math.sin(time / 260 + enemy.patternPhase) * 0.035 : 0))
    if (!enemy.isBoss && enemy.spawnCategory === 'GROUND') enemy.groundY = y + size * 0.22
    const shadowY = enemy.isBoss || enemy.spawnCategory === 'SPECIAL' ? enemy.groundY + size * 0.25 : enemy.groundY
    const shadowAlpha = enemy.spawnCategory === 'FLYING' || enemy.isBoss && enemy.airLift > 0 || enemy.spawnCategory === 'SPECIAL' && enemy.airLift > 0
      ? 0.14 + enemy.progress * 0.16
      : 0.26 + enemy.progress * 0.24
    enemy.shadow.setPosition(x, shadowY).setSize(size * 0.54, size * 0.12).setAlpha(shadowAlpha)
    if (enemy.tether) enemy.tether.clear().lineStyle(2, 0xe8f8ed, 0.5).beginPath().moveTo(x, -20).lineTo(x, y - size * 0.24).strokePath()
    enemy.healthBar.clear()
    if (enemy.health < enemy.maxHealth || enemy.isBoss) {
      const barWidth = enemy.isBoss ? size * 0.76 : size * 0.48
      const barHeight = enemy.isBoss ? 18 : 11
      const barX = x - barWidth / 2
      const barY = y - size * 0.47
      enemy.healthBar.fillStyle(0x301e17, 0.9).fillRoundedRect(barX, barY, barWidth, barHeight, 6)
      enemy.healthBar.fillStyle(enemy.isBoss ? 0xff3157 : 0xff5e55, 1).fillRoundedRect(barX + 2, barY + 2, Math.max(0, (barWidth - 4) * enemy.health / enemy.maxHealth), barHeight - 4, 5)
    }
  }

  private updateDeadEnemy(index: number, enemy: EnemyState, time: number) {
    const t = clamp((time - enemy.stateStartedAt) / 320, 0, 1)
    enemy.image.setPosition(enemy.currentX, enemy.bodyY + 20 * t).setAlpha(1 - t).setScale(enemy.deathScaleX * (1 - 0.32 * t), enemy.deathScaleY * (1 - 0.32 * t))
    enemy.image.setRotation(enemy.deathRotation + (enemy.targetPlayerId === 1 ? -1 : 1) * 0.62 * t)
    enemy.shadow.setAlpha(Math.max(0, 0.35 * (1 - t)))
    enemy.healthBar.clear()
    enemy.debugLabel?.setVisible(false)
    if (t >= 1) this.removeEnemy(index)
  }

  private updateEnemyDebug(enemy: EnemyState, time: number, size: number) {
    const label = enemy.debugLabel
    if (!label) return
    if (!this.debugEnabled) {
      label.setVisible(false)
      return
    }
    const config = ENEMY_SPECS[enemy.type].movement
    const cooldown = Math.max(0, enemy.attackReadyAt - time) / 1000
    label.setVisible(true).setPosition(enemy.currentX, enemy.bodyY - size * 0.55)
      .setText(`#${enemy.enemyId} ${enemy.type} ${enemy.spawnCategory}\n${enemy.pattern ?? 'LEGACY'} | ${enemy.aiState}\nP${enemy.targetPlayerId} depth ${enemy.progress.toFixed(2)} scale ${enemy.image.scaleY.toFixed(2)}\nattack range ${config.attackRange} | cd ${cooldown.toFixed(1)}s`)
    const target = this.getEnemyTarget(enemy)
    if (target && enemy.aiState === 'ATTACK') {
      const hitbox = this.getAttackZone(target)
      this.enemyDebugGraphics.lineStyle(3, 0xff4f58, 0.9).strokeRect(hitbox.left, hitbox.top, hitbox.right - hitbox.left, hitbox.bottom - hitbox.top)
      this.enemyDebugGraphics.lineStyle(2, 0xffd764, 0.95).strokeRect(enemy.currentX - enemy.image.displayWidth * 0.5, enemy.bodyY - enemy.image.displayHeight * enemy.image.originY, enemy.image.displayWidth, enemy.image.displayHeight)
    }
  }

  private hitEnemy(enemy: EnemyState, playerId: 1 | 2, damage: number) {
    if (enemy.aiState === 'DEAD') return
    const player = this.players[playerId - 1]
    enemy.health = Math.max(0, enemy.health - damage)
    enemy.image.setTint(0xffe9a2)
    if (enemy.health > 0) {
      if (enemy.isBoss && (enemy.aiState === 'WINDUP' || enemy.aiState === 'ATTACK') && !enemy.attackHasHit) {
        const now = this.time.now
        enemy.resumeStateAfterHit = 'RETREAT'
        enemy.attackHasHit = true
        enemy.attackFromDistance = Phaser.Math.Between(0, 100) < 35
        enemy.attackReadyAt = Math.max(enemy.attackReadyAt, now + 900)
        enemy.bodyY = Math.max(enemy.startY, enemy.bodyY - 36)
        enemy.approachY = Math.min(enemy.approachY, enemy.bodyY)
        enemy.progress = clamp((enemy.approachY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 0.92)
        this.setEnemyState(enemy, 'HIT_REACTION', now)
      } else if (!enemy.isBoss && enemy.spawnCategory !== 'SPECIAL') {
        enemy.resumeStateAfterHit = enemy.aiState === 'WINDUP' || enemy.aiState === 'ATTACK' ? 'RECOVERY' : 'APPROACH'
        const knockback = ENEMY_SPECS[enemy.type].movement.hitKnockback
        enemy.bodyY = Math.max(enemy.startY, enemy.bodyY - knockback)
        enemy.approachY = Math.min(enemy.approachY, enemy.bodyY)
        enemy.progress = clamp((enemy.approachY - enemy.startY) / Math.max(1, enemy.goalY - enemy.startY), 0, 1)
        if (enemy.aiState === 'ATTACK' || enemy.aiState === 'WINDUP') {
          enemy.attackHasHit = true
          enemy.attackEndX = enemy.currentX
          enemy.attackEndY = enemy.bodyY
          enemy.attackEndGroundY = enemy.groundY
          enemy.attackReadyAt = Math.max(enemy.attackReadyAt, this.time.now + ENEMY_SPECS[enemy.type].movement.attackCooldown * 0.55)
        }
        this.setEnemyState(enemy, 'HIT_REACTION', this.time.now)
      } else {
        this.time.delayedCall(95, () => { if (enemy.image.active && this.time.now >= enemy.frozenUntil) enemy.image.clearTint() })
      }
      return
    }
    const now = this.time.now
    player.combo = now - player.lastKillAt <= 2300 ? player.combo + 1 : 1
    player.lastKillAt = now
    player.kills += 1
    player.score += 100 + Math.max(0, player.combo - 1) * 20
    this.totalKills += 1
    const wasBoss = enemy.isBoss
    if (wasBoss) player.score += 1500
    else {
      const drops: Array<'heart' | WeaponMode> = []
      if (Math.random() < HEART_DROP_CHANCE) drops.push('heart')
      if (this.stage >= 2 && Math.random() < WEAPON_DROP_CHANCE) drops.push('cannon')
      if (this.stage >= 2 && Math.random() < WEAPON_DROP_CHANCE) drops.push('ice')
      drops.forEach((drop, dropIndex) => {
        const x = enemy.image.x + (dropIndex - (drops.length - 1) / 2) * 120
        if (drop === 'heart') this.spawnHeart(x, enemy.image.y)
        else this.spawnWeapon(x, enemy.image.y, drop)
      })
    }
    const index = this.enemies.indexOf(enemy)
    if (wasBoss) {
      const rewardX = enemy.image.x
      const rewardY = Math.min(enemy.image.y, 800)
      if (index >= 0) this.removeEnemy(index)
      this.clearEnemies()
      this.bossHeartsRemaining = 2
      this.spawnHeart(rewardX - 86, rewardY, true)
      this.spawnHeart(rewardX + 86, rewardY, true)
    } else {
      this.setEnemyState(enemy, 'DEAD', now)
    }
  }

  private spawnHeart(x: number, y: number, bossReward = false) {
    const glow = this.add.circle(0, 0, 35, 0xff4770, 0.3)
    const heart = this.add.text(0, -1, '♥', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '74px', color: '#ff3865', stroke: '#fff3f5', strokeThickness: 7 }).setOrigin(0.5)
    const container = this.add.container(x, y, [glow, heart]).setDepth(29)
    this.tweens.add({ targets: container, y: y - 14, alpha: 0.78, duration: 460, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    this.heartPickups.push({ container, x, y, expiresAt: bossReward ? Number.POSITIVE_INFINITY : this.time.now + PICKUP_LIFETIME_MS, bossReward })
  }

  private spawnWeapon(x: number, y: number, weapon: WeaponMode) {
    const color = weapon === 'cannon' ? 0xffb548 : 0x6bdcff
    const glow = this.add.circle(0, 0, 49, color, 0.3)
    const image = this.add.image(0, -8, `weapon-${weapon}`).setDisplaySize(108, 72)
    const label = this.add.text(0, 48, weapon === 'cannon' ? 'PHÁO' : 'BĂNG', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '18px', color: '#ffffff', stroke: '#183328', strokeThickness: 5 }).setOrigin(0.5)
    const container = this.add.container(x, y, [glow, image, label]).setDepth(29)
    this.tweens.add({ targets: container, y: y - 14, alpha: 0.78, duration: 460, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    this.weaponPickups.push({ container, x, y, weapon, expiresAt: this.time.now + PICKUP_LIFETIME_MS })
  }

  private updatePickups(time: number) {
    this.heartPickups = this.heartPickups.filter((pickup) => {
      if ((pickup.bossReward || pickup.expiresAt > time) && pickup.container.active) return true
      this.destroyPickup(pickup)
      return false
    })
    this.weaponPickups = this.weaponPickups.filter((pickup) => {
      if (pickup.expiresAt > time && pickup.container.active) return true
      this.destroyPickup(pickup)
      return false
    })
  }

  private collectHeart(index: number, player: PlayerState) {
    const [pickup] = this.heartPickups.splice(index, 1)
    if (pickup) this.destroyPickup(pickup)
    if (player.hp < MAX_PLAYER_HEARTS) player.hp += 1
    else player.health = player.maxHealth
    player.score += 250
    this.addBurst(pickup?.x ?? 960, pickup?.y ?? 520, 0xff4770)
    if (pickup?.bossReward) {
      this.bossHeartsRemaining = Math.max(0, this.bossHeartsRemaining - 1)
      if (this.bossHeartsRemaining === 0) this.finish('WON')
    }
  }

  private collectWeapon(index: number, player: PlayerState) {
    const [pickup] = this.weaponPickups.splice(index, 1)
    if (!pickup) return
    this.destroyPickup(pickup)
    player.weaponInventory[pickup.weapon] = Math.min(9, player.weaponInventory[pickup.weapon] + 1)
    this.addBurst(pickup.x, pickup.y, pickup.weapon === 'cannon' ? 0xffb548 : 0x6bdcff)
    this.emitSnapshot(true)
  }

  private removeEnemy(index: number) {
    const [enemy] = this.enemies.splice(index, 1)
    enemy.image.destroy()
    enemy.shadow.destroy()
    enemy.healthBar.destroy()
    enemy.tether?.destroy()
    enemy.debugLabel?.destroy()
  }

  private clearEnemies() {
    this.enemies.forEach((enemy) => {
      enemy.image.destroy()
      enemy.shadow.destroy()
      enemy.healthBar.destroy()
      enemy.tether?.destroy()
      enemy.debugLabel?.destroy()
    })
    this.enemies = []
    this.enemyDebugGraphics?.clear()
  }

  private clearPickups() {
    this.heartPickups.forEach((pickup) => this.destroyPickup(pickup))
    this.heartPickups = []
    this.weaponPickups.forEach((pickup) => this.destroyPickup(pickup))
    this.weaponPickups = []
  }

  private destroyPickup(pickup: { container: Phaser.GameObjects.Container }) {
    this.tweens.killTweensOf(pickup.container)
    pickup.container.destroy()
  }

  private addBurst(x: number, y: number, color: number) {
    const burst = this.add.circle(x, y, 5, color, 0.95).setDepth(28)
    this.tweens.add({ targets: burst, radius: 43, alpha: 0, duration: 260, ease: 'Quad.Out', onComplete: () => burst.destroy() })
  }

  private updateCrosshairs() {
    this.players.forEach((player, index) => {
      if (DEV_TEST && !player.connected) {
        player.aimX = this.localAim[index].x
        player.aimY = this.localAim[index].y
      }
      const x = (player.aimX + 1) * WIDTH / 2
      const y = 250 + clamp(player.aimY, 0, 1) * 560
      const graphic = this.crosshairs[index]
      const color = PLAYER_COLORS[player.playerId]
      graphic.clear().lineStyle(7, 0x122317, 0.38).strokeCircle(x, y, 29).lineStyle(5, color, player.connected || DEV_TEST ? 1 : 0.58).strokeCircle(x, y, 29)
      graphic.lineStyle(7, 0x122317, 0.38).beginPath().moveTo(x - 45, y).lineTo(x - 15, y).strokePath().beginPath().moveTo(x + 15, y).lineTo(x + 45, y).strokePath()
      graphic.beginPath().moveTo(x, y - 45).lineTo(x, y - 15).strokePath().beginPath().moveTo(x, y + 15).lineTo(x, y + 45).strokePath()
      graphic.fillStyle(color, 1).fillCircle(x, y, 5)
    })
  }

  private drawShots(time: number) {
    this.traces = this.traces.filter((trace) => trace.expiresAt > time)
    for (const trace of this.traces) {
      const player = this.players[trace.playerId - 1]
      const startX = trace.playerId === 1 ? 330 : 1590
      const startY = 850
      const alpha = clamp((trace.expiresAt - time) / 95, 0, 1)
      const cannon = trace.weaponMode === 'cannon'
      const ice = trace.weaponMode === 'ice'
      this.depth.lineStyle(cannon ? 24 : 12, cannon ? 0xffa932 : ice ? 0x59dcff : PLAYER_COLORS[trace.playerId], 0.25 * alpha).beginPath().moveTo(startX, startY).lineTo(trace.aimX, trace.aimY).strokePath()
      this.depth.lineStyle(cannon ? 9 : ice ? 6 : 4, trace.hit ? 0xfff0b0 : cannon ? 0xffd15e : ice ? 0xc5faff : PLAYER_COLORS[trace.playerId], 0.95 * alpha).beginPath().moveTo(startX, startY).lineTo(trace.aimX, trace.aimY).strokePath()
      this.depth.fillStyle(ice ? 0x8af0ff : cannon ? 0xffa932 : PLAYER_COLORS[player.playerId], 0.78 * alpha).fillCircle(startX, startY, (cannon ? 25 : 18) * alpha)
    }
  }

  private finish(status: 'WON' | 'LOST') {
    if (this.gameStatus !== 'PLAYING') return
    this.gameStatus = status
    this.players.forEach((player) => { player.fire = false })
    this.localFire = [false, false]
    this.emitSnapshot(true)
  }

  private emitSnapshot(force = false) {
    const now = this.time?.now ?? 0
    if (!force && now - this.lastSnapshotAt < 130) return
    this.lastSnapshotAt = now
    const boss = this.enemies.find((enemy) => enemy.isBoss)
    const snapshot: HuntSnapshot = {
      status: this.gameStatus,
      kills: this.totalKills,
      stage: this.stage,
      phase: this.phase,
      bossName: this.stage % 2 === 1 ? 'Heo rừng khổng lồ' : 'Dơi khổng lồ',
      bossHealth: boss?.health ?? 0,
      bossMaxHealth: boss?.maxHealth ?? 0,
      bossHeartsRemaining: this.bossHeartsRemaining,
      difficulty: this.difficulty,
      players: this.players.map(({ playerId, hp, health, maxHealth, score, kills, ammo, maxAmmo, combo, connected, reloadRemaining, abilityCooldowns, weaponMode, weaponExpiresAt, weaponInventory }) => ({ playerId, hp, health, maxHealth, score, kills, ammo, maxAmmo, combo, connected, reloadRemaining, abilityCooldowns, weaponMode, weaponRemaining: Math.max(0, weaponExpiresAt - now), weaponInventory: { ...weaponInventory } })) as [PlayerSnapshot, PlayerSnapshot],
      activeEnemies: this.enemies.filter((enemy) => enemy.aiState !== 'DEAD').length,
    }
    this.lastSnapshot = snapshot
    this.events.emit('state', snapshot)
    this.onSnapshot?.(snapshot)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0))
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}
