import { createGameImage } from '../../general/phaser-game-image'
import type { GameImage } from '../../general/game-image'
import * as Phaser from 'phaser'
import { BUBBLE_CONFIG, BUBBLE_VISUAL_CONFIG } from '../config/bubble'

export interface BubbleMovement {
  radius: number
  verticalSpeed: number
  horizontalAmplitude: number
  horizontalFrequency: number
  phase: number
}

export class Bubble extends Phaser.GameObjects.Container {
  readonly value: string | number
  readonly hitRadius: number
  readonly baseX: number
  private readonly riseSpeed: number
  private readonly phase: number
  private readonly sway: number
  private readonly frequency: number
  private readonly gameWidth: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: string | number,
    color: number,
    movement: BubbleMovement,
    gameWidth: number,
    image?: GameImage,
  ) {
    const radius = movement.radius
    const balloon = scene.add.image(0, radius * BUBBLE_VISUAL_CONFIG.bodyOffsetYFactor, 'balloon')
      .setDisplaySize(
        radius * BUBBLE_VISUAL_CONFIG.bodyWidthFactor,
        radius * BUBBLE_VISUAL_CONFIG.bodyHeightFactor,
      )
      .setTint(color)
      .setAlpha(BUBBLE_VISUAL_CONFIG.colorOpacity)
    const label = scene.add.text(0, 1, String(value), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.round(radius * BUBBLE_VISUAL_CONFIG.numberSizeFactor)}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#2f286b',
      strokeThickness: BUBBLE_VISUAL_CONFIG.numberStrokeThickness,
    }).setOrigin(0.5)
    label.setShadow(
      0,
      BUBBLE_VISUAL_CONFIG.numberShadowOffsetY,
      'rgba(31, 27, 82, 0.28)',
      2,
    )
    label.setScale(Math.min(1, radius * 1.35 / label.width, radius * 1.15 / label.height))

    const picture = createGameImage(scene, image, 0, 0, radius * 1.25, radius * 1.25)
    if (picture) label.destroy()
    super(scene, x, y, [balloon, picture ?? label])
    this.value = value
    this.hitRadius = radius
    this.baseX = x
    this.riseSpeed = movement.verticalSpeed
    this.phase = movement.phase
    this.sway = movement.horizontalAmplitude
    this.frequency = movement.horizontalFrequency
    this.gameWidth = gameWidth
    scene.add.existing(this)
  }

  float(time: number, delta: number) {
    this.y -= this.riseSpeed * (delta / 1000)
    const nextX = this.baseX + Math.sin(time * this.frequency + this.phase) * this.sway
    this.x = Phaser.Math.Clamp(
      nextX,
      this.hitRadius + BUBBLE_CONFIG.edgeMargin,
      this.gameWidth - this.hitRadius - BUBBLE_CONFIG.edgeMargin,
    )
  }

  isOutside() {
    return this.y <= BUBBLE_CONFIG.topDespawnY
  }
}
