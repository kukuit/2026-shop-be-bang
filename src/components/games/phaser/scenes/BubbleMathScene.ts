import * as Phaser from 'phaser'
import { Bubble } from '../objects/Bubble'
import { Shooter } from '../objects/Shooter'
import { QuestionSystem } from '../systems/QuestionSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { BubbleSpawner } from '../systems/BubbleSpawner'
import { BUBBLE_CONFIG } from '../config/bubble'
import type { MathQuestion } from '../types/game'

const WIDTH = 720
const HEIGHT = 1280
const TOTAL_QUESTIONS = 5

export class BubbleMathScene extends Phaser.Scene {
  private readonly questions = new QuestionSystem()
  private readonly score = new ScoreSystem()
  private currentQuestion!: MathQuestion
  private bubbles!: Phaser.GameObjects.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private shooter!: Shooter
  private questionText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private progressText!: Phaser.GameObjects.Text
  private nextButton!: Phaser.GameObjects.Container
  private nextButtonLabel!: Phaser.GameObjects.Text
  private bubbleSpawner!: BubbleSpawner
  private locked = false
  private lastShotAt = 0
  private questionNumber = 1

  constructor() {
    super('BubbleMathScene')
  }

  create() {
    this.drawBackground()
    this.bubbles = this.add.group({ runChildUpdate: false })
    this.projectiles = this.physics.add.group({ maxSize: 8, allowGravity: false })

    this.add.rectangle(WIDTH / 2, 116, 590, 138, 0xffffff, 0.88).setStrokeStyle(5, 0xffffff, 0.95)
    this.questionText = this.add.text(WIDTH / 2, 115, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '62px', fontStyle: 'bold', color: '#312e81',
    }).setOrigin(0.5).setDepth(10)
    this.feedbackText = this.add.text(WIDTH / 2, 215, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#047857',
      stroke: '#ffffff', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(30)
    this.scoreText = this.add.text(38, HEIGHT - 58, '★ Điểm: 0', {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#713f12',
      backgroundColor: '#fef3c7', padding: { x: 18, y: 10 },
    }).setOrigin(0, 1).setDepth(30)
    this.progressText = this.add.text(WIDTH - 38, HEIGHT - 58, `1/${TOTAL_QUESTIONS}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#312e81',
      backgroundColor: '#ffffff', padding: { x: 18, y: 10 },
    }).setOrigin(1, 1).setDepth(30)

    const nextBackground = this.add.rectangle(0, 0, 188, 68, 0x16a34a).setStrokeStyle(4, 0xffffff)
    this.nextButtonLabel = this.add.text(0, 0, 'Tiếp theo  →', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    this.nextButton = this.add.container(WIDTH - 130, HEIGHT - 145, [nextBackground, this.nextButtonLabel])
      .setSize(188, 68)
      .setDepth(40)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
    this.nextButton.on('pointerdown', this.goToNextQuestion, this)

    this.shooter = new Shooter(this, WIDTH / 2, HEIGHT - 120)
    this.bubbleSpawner = new BubbleSpawner(this, {
      width: WIDTH,
      height: HEIGHT,
      getActiveBubbles: () => this.bubbles.getChildren() as Bubble[],
      addBubble: (bubble) => this.bubbles.add(bubble),
    })

    this.input.on('pointermove', this.aim, this)
    this.input.on('pointerdown', this.aim, this)
    this.input.on('pointerup', this.shoot, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)

    this.startQuestion()
  }

  update(time: number, delta: number) {
    this.bubbles.getChildren().forEach((item) => {
      const bubble = item as Bubble
      bubble.float(time, delta)
      if (bubble.isOutside()) bubble.destroy()
    })

    this.projectiles.getChildren().forEach((item) => {
      const projectile = item as Phaser.Physics.Arcade.Image
      if (projectile.x < -30 || projectile.x > WIDTH + 30 || projectile.y < -30) projectile.destroy()
    })

    this.checkProjectileHits()
  }

  private drawBackground() {
    const background = this.add.graphics()
    background.fillGradientStyle(0x9ddcff, 0x9ddcff, 0xe0f7ff, 0xffe5ef, 1)
    background.fillRect(0, 0, WIDTH, HEIGHT)
    background.fillStyle(0xffffff, 0.65)
    ;[[90, 290, 58], [610, 380, 48], [115, 710, 42]].forEach(([x, y, r]) => {
      background.fillCircle(x, y, r)
      background.fillCircle(x + r * 0.8, y + 6, r * 0.72)
      background.fillEllipse(x + r * 0.4, y + r * 0.45, r * 2.3, r * 0.65)
    })
    background.fillStyle(0xffffff, 0.22)
    for (let index = 0; index < 16; index += 1) {
      background.fillCircle(Phaser.Math.Between(15, WIDTH - 15), Phaser.Math.Between(260, HEIGHT - 220), Phaser.Math.Between(3, 9))
    }

    const texture = this.add.graphics()
    texture.fillStyle(0xffffff).fillCircle(9, 9, 9)
    texture.generateTexture('math-projectile', 18, 18)
    texture.destroy()
  }

  private startQuestion() {
    this.clearRound()
    this.currentQuestion = this.questions.next()
    this.questionText.setText(this.currentQuestion.text)
    this.feedbackText.setText('')
    this.progressText.setText(`${this.questionNumber}/${TOTAL_QUESTIONS}`)
    this.nextButton.setVisible(false)
    this.locked = false
    this.bubbleSpawner.start(this.currentQuestion)
  }

  private aim(pointer: Phaser.Input.Pointer) {
    this.shooter.setAim(pointer.worldX, pointer.worldY)
  }

  private shoot(pointer: Phaser.Input.Pointer) {
    this.aim(pointer)
    if (this.locked || this.time.now - this.lastShotAt < 320 || this.projectiles.countActive(true) >= 8) return
    this.lastShotAt = this.time.now
    const shot = this.shooter.shot
    const projectile = this.projectiles.create(shot.x, shot.y, 'math-projectile') as Phaser.Physics.Arcade.Image
    projectile.setCircle(9).setDepth(15)
    projectile.setVelocity(Math.cos(shot.angle) * 940, Math.sin(shot.angle) * 940)
  }

  private handleHit(projectileObject: unknown, bubbleObject: unknown) {
    const projectile = projectileObject as Phaser.Physics.Arcade.Image
    const bubble = bubbleObject as Bubble
    if (!projectile.active || !bubble.active || this.locked) return
    projectile.destroy()

    if (bubble.value === this.currentQuestion.answer) {
      this.locked = true
      this.bubbleSpawner.pause()
      this.scoreText.setText(`★ Điểm: ${this.score.correct()}`)
      this.feedbackText.setColor('#047857').setText('Chính xác! +10 ★')
      this.pop(bubble, true)
      this.nextButtonLabel.setText(this.questionNumber === TOTAL_QUESTIONS ? 'Chơi lại  ↻' : 'Tiếp theo  →')
      this.nextButton.setVisible(true)
    } else {
      this.scoreText.setText(`★ Điểm: ${this.score.wrong()}`)
      this.feedbackText.setColor('#be123c').setText('Chưa đúng! -2')
      this.pop(bubble, false)
      this.time.delayedCall(650, () => {
        if (!this.locked) this.feedbackText.setText('')
      })
    }
  }

  private checkProjectileHits() {
    if (this.locked) return
    const projectiles = this.projectiles.getChildren() as Phaser.Physics.Arcade.Image[]
    const bubbles = this.bubbles.getChildren() as Bubble[]

    for (const projectile of projectiles) {
      if (!projectile.active) continue
      for (const bubble of bubbles) {
        if (!bubble.active || bubble.y > BUBBLE_CONFIG.shooterSafeTop) continue
        const hitDistance = bubble.hitRadius + 9
        if (Phaser.Math.Distance.Squared(projectile.x, projectile.y, bubble.x, bubble.y) <= hitDistance * hitDistance) {
          this.handleHit(projectile, bubble)
          break
        }
      }
    }
  }

  private goToNextQuestion() {
    if (!this.locked) return
    this.questionNumber = this.questionNumber === TOTAL_QUESTIONS ? 1 : this.questionNumber + 1
    this.startQuestion()
  }

  private pop(bubble: Bubble, correct: boolean) {
    const color = correct ? 0xfacc15 : 0xfb7185
    for (let index = 0; index < (correct ? 12 : 7); index += 1) {
      const dot = this.add.circle(bubble.x, bubble.y, Phaser.Math.Between(5, 10), color).setDepth(25)
      const angle = (Math.PI * 2 * index) / (correct ? 12 : 7)
      this.tweens.add({
        targets: dot,
        x: bubble.x + Math.cos(angle) * Phaser.Math.Between(55, 100),
        y: bubble.y + Math.sin(angle) * Phaser.Math.Between(55, 100),
        alpha: 0,
        scale: 0.2,
        duration: 240,
        onComplete: () => dot.destroy(),
      })
    }
    this.tweens.add({ targets: bubble, scale: 1.25, alpha: 0, duration: 190, onComplete: () => bubble.destroy() })
  }

  private clearRound() {
    this.bubbles?.clear(true, true)
    this.projectiles?.clear(true, true)
  }

  private cleanup() {
    this.bubbleSpawner?.destroy()
    this.input.off('pointermove', this.aim, this)
    this.input.off('pointerdown', this.aim, this)
    this.input.off('pointerup', this.shoot, this)
    this.nextButton?.off('pointerdown', this.goToNextQuestion, this)
  }
}
