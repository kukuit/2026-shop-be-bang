import * as Phaser from 'phaser'
import { BUBBLE_COLORS, BUBBLE_CONFIG } from '../config/bubble'
import { Bubble, type BubbleMovement } from '../objects/Bubble'
import type { MathQuestion } from '../types/game'

interface BubbleSpawnerOptions {
  width: number
  height: number
  getActiveBubbles: () => Bubble[]
  addBubble: (bubble: Bubble) => void
}

export class BubbleSpawner {
  private question?: MathQuestion
  private timer?: Phaser.Time.TimerEvent
  private lastSpawnLane = -1
  private spawnedCount = 0
  private correctSpawnOrder: number = BUBBLE_CONFIG.correctSpawnOrderMin

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: BubbleSpawnerOptions,
  ) {}

  start(question: MathQuestion) {
    this.stopTimer()
    this.question = question
    this.lastSpawnLane = -1
    this.spawnedCount = 0
    this.correctSpawnOrder = Phaser.Math.Between(
      BUBBLE_CONFIG.correctSpawnOrderMin,
      BUBBLE_CONFIG.correctSpawnOrderMax,
    )
    this.schedule(BUBBLE_CONFIG.initialSpawnDelay)
  }

  pause() {
    this.stopTimer()
  }

  destroy() {
    this.stopTimer()
    this.question = undefined
  }

  private stopTimer() {
    this.timer?.destroy()
    this.timer = undefined
  }

  private schedule(delay?: number) {
    this.stopTimer()
    this.timer = this.scene.time.delayedCall(
      delay ?? Phaser.Math.Between(BUBBLE_CONFIG.spawnDelayMin, BUBBLE_CONFIG.spawnDelayMax),
      this.trySpawn,
      [],
      this,
    )
  }

  private trySpawn() {
    if (!this.question) return

    const active = this.options.getActiveBubbles().filter((bubble) => bubble.active)
    if (active.length < BUBBLE_CONFIG.targetActive && active.length < BUBBLE_CONFIG.maxActive) {
      this.createBubble(active)
      this.schedule()
      return
    }
    this.schedule(BUBBLE_CONFIG.refillCheckDelay)
  }

  private createBubble(active: Bubble[]) {
    if (!this.question) return
    const hasCorrect = active.some((bubble) => bubble.value === this.question?.answer)
    const nextSpawnOrder = this.spawnedCount + 1
    const mustSpawnCorrect = !hasCorrect && nextSpawnOrder >= this.correctSpawnOrder
    const value = mustSpawnCorrect ? this.question.answer : this.pickDistractor(active)
    const radius = Phaser.Math.Between(BUBBLE_CONFIG.radiusMin, BUBBLE_CONFIG.radiusMax)
    const amplitude = Phaser.Math.Between(BUBBLE_CONFIG.swayMin, BUBBLE_CONFIG.swayMax)
    const position = this.findPosition(active, radius, amplitude, mustSpawnCorrect)

    if (!position) return

    const movement: BubbleMovement = {
      radius,
      verticalSpeed: Phaser.Utils.Array.GetRandom([...BUBBLE_CONFIG.speedLevels]),
      horizontalAmplitude: amplitude,
      horizontalFrequency: Phaser.Math.FloatBetween(BUBBLE_CONFIG.frequencyMin, BUBBLE_CONFIG.frequencyMax),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    }
    const bubble = new Bubble(
      this.scene,
      position.x,
      position.y,
      value,
      Phaser.Utils.Array.GetRandom([...BUBBLE_COLORS]),
      movement,
      this.options.width,
    )
    this.lastSpawnLane = position.lane
    this.spawnedCount += 1
    this.options.addBubble(bubble)
  }

  private pickDistractor(active: Bubble[]) {
    if (!this.question) return 0
    const activeValues = new Set(active.map((bubble) => bubble.value))
    const candidates = this.question.options.filter(
      (value) => value !== this.question?.answer && !activeValues.has(value),
    )
    const fallback = this.question.options.filter((value) => value !== this.question?.answer)
    return Phaser.Utils.Array.GetRandom(candidates.length > 0 ? candidates : fallback)
  }

  private findPosition(active: Bubble[], radius: number, amplitude: number, isCorrect: boolean) {
    const laneWidth = this.options.width / BUBBLE_CONFIG.lanes
    const minimumDistance = isCorrect
      ? BUBBLE_CONFIG.correctMinDistance
      : BUBBLE_CONFIG.minDistance

    for (let attempt = 0; attempt < BUBBLE_CONFIG.maxSpawnAttempts; attempt += 1) {
      const availableLanes = Array.from(
        { length: BUBBLE_CONFIG.lanes },
        (_, lane) => lane,
      ).filter((lane) => lane !== this.lastSpawnLane)
      const lane = Phaser.Utils.Array.GetRandom(availableLanes)
      const laneCenter = laneWidth * (lane + 0.5)
      const safeMin = radius + amplitude + BUBBLE_CONFIG.edgeMargin
      const safeMax = this.options.width - safeMin
      const x = Phaser.Math.Clamp(
        laneCenter + Phaser.Math.Between(-BUBBLE_CONFIG.laneJitter, BUBBLE_CONFIG.laneJitter),
        safeMin,
        safeMax,
      )
      const y = BUBBLE_CONFIG.shooterSafeTop + radius + Phaser.Math.Between(
        BUBBLE_CONFIG.spawnOffsetMin,
        BUBBLE_CONFIG.spawnOffsetMax,
      )

      const hasConflict = active.some((bubble) => {
        const horizontalGap = Math.abs(x - bubble.baseX)
        const verticalGap = Math.abs(y - bubble.y)
        const sameLanePath = horizontalGap < laneWidth * 0.72 && verticalGap < minimumDistance * 1.35
        const tooClose = Phaser.Math.Distance.Between(x, y, bubble.x, bubble.y) < minimumDistance
        return sameLanePath || tooClose
      })

      if (!hasConflict) return { x, y, lane }
    }

    return undefined
  }
}
