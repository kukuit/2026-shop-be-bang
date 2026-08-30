import * as Phaser from 'phaser'
import { Bubble } from '../objects/Bubble'
import { Shooter } from '../objects/Shooter'
import { QuestionSystem } from '../systems/QuestionSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { BubbleSpawner } from '../systems/BubbleSpawner'
import { BUBBLE_CONFIG } from '../config/bubble'
import type { BubbleShooterGameConfig, MathQuestion } from '../types/game'
import { GAME_BACKGROUND_MUSIC } from '../../general/audio'
import { GameVoiceManager, type VoicePriority } from '../../general/GameVoiceManager'
import { createGameTracker, type GameTracker } from '../../general/tracking'

const WIDTH = 720
const HEIGHT = 1280
const HUD_TOP = 1182
const QUESTION_Y = 145
type RoundState = 'PLAYING' | 'CORRECT' | 'SHOW_RESULT' | 'ROUND_TRANSITION' | 'NEW_QUESTION' | 'COMPLETE'

export class BubbleMathScene extends Phaser.Scene {
  private questions?: QuestionSystem
  private readonly score = new ScoreSystem()
  private currentQuestion!: MathQuestion
  private bubbles!: Phaser.GameObjects.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private shooter!: Shooter
  private questionText!: Phaser.GameObjects.Container
  private scoreText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private progressText!: Phaser.GameObjects.Text
  private nextButton!: Phaser.GameObjects.Container
  private nextButtonLabel!: Phaser.GameObjects.Text
  private bubbleSpawner!: BubbleSpawner
  private locked = false
  private lastShotAt = 0
  private questionNumber = 1
  private selectedAmmo = 0
  private ammoSelectionRings: Phaser.GameObjects.Arc[] = []
  private levelTitleText!: Phaser.GameObjects.Text
  private levelProgressFill!: Phaser.GameObjects.Graphics
  private levelProgressStar!: Phaser.GameObjects.Text
  private roundState: RoundState = 'PLAYING'
  private transitionTimers = new Set<Phaser.Time.TimerEvent>()
  private transitionLabel?: Phaser.GameObjects.Text
  private isPauseMenuOpen = false
  private gameStarted = false
  private backgroundMusic?: Phaser.Sound.BaseSound
  private voiceManager?: GameVoiceManager
  private wolf?: Phaser.GameObjects.Sprite
  private wolfShotTimer?: Phaser.Time.TimerEvent
  private wolfArrow?: Phaser.GameObjects.Triangle
  private wolfBusy = false
  private wolfActionTimers = new Set<Phaser.Time.TimerEvent>()
  private wolfRounds = new Set<number>()
  private winVoiceTimer?: ReturnType<typeof setTimeout>
  private tracker?: GameTracker

  constructor(private readonly lesson: BubbleShooterGameConfig) {
    super('BubbleMathScene')
  }

  private get totalQuestions() {
    return this.lesson.totalRounds
  }

  preload() {
    this.load.on('progress', (progress: number) => {
      this.game.events.emit('bubble-shooter:load-progress', progress)
    })

    this.load.image('game-background', '/games/bubble-shooter/images/background.png')
    this.load.image('player-avatar-preload', '/games/general/images/player-avatar.png')
    this.load.image('cannon-base', '/games/bubble-shooter/images/cannon-base.png')
    this.load.image('cannon-barrel', '/games/bubble-shooter/images/cannon-barrel.png')
    this.load.image('question-panel', '/games/bubble-shooter/images/question-panel.png')
    this.load.image('balloon', '/games/bubble-shooter/images/balloon.png')
    this.load.image('cappy', '/games/bubble-shooter/images/cappy.png')
    this.load.spritesheet('ammo', '/games/bubble-shooter/images/ammo.png', {
      frameWidth: 724,
      frameHeight: 724,
    })
    this.load.spritesheet('wolf', '/games/bubble-shooter/images/wolf.png', {
      frameWidth: 512,
      frameHeight: 512,
    })
    this.load.audio('voice-background', GAME_BACKGROUND_MUSIC)
    this.load.audio('voice-bullet-rocket', '/games/bubble-shooter/voices/bullet-rocket.mp3')
    this.load.audio('voice-bullet-bomb', '/games/bubble-shooter/voices/bullet-bomb.mp3')
    this.load.audio('voice-bullet-bubble', '/games/bubble-shooter/voices/bullet-bubble.mp3')
    this.load.audio('voice-bubble-pop', '/games/bubble-shooter/voices/bubble-pop.mp3')
    if (this.lesson.introVoice) this.load.audio('voice-intro', this.lesson.introVoice)
    this.load.audio('voice-true-1', '/games/general/voices/true-1.mp3')
    this.load.audio('voice-true-2', '/games/general/voices/true-2.mp3')
    this.load.audio('voice-true-3', '/games/general/voices/true-3.mp3')
    this.load.audio('voice-true-4', '/games/general/voices/true-4.mp3')
    this.load.audio('voice-true-5', '/games/general/voices/true-5.mp3')
    this.load.audio('voice-false-1', '/games/general/voices/false-1.mp3')
    this.load.audio('voice-false-2', '/games/general/voices/false-2.mp3')
    this.load.audio('voice-false-3', '/games/general/voices/false-3.mp3')
    this.load.audio('voice-false-4', '/games/general/voices/false-4.mp3')
    this.load.audio('voice-false-5', '/games/general/voices/false-5.mp3')
    this.load.audio('voice-win', '/games/general/voices/win.mp3')
    this.load.audio('voice-wolf-haha', '/games/general/voices/wolf-haha.mp3')
  }

  create() {
    this.setupAudio()
    this.drawBackground()
    this.game.events.on('game-ui:mute', this.setMuted, this)
    this.game.events.on('game-ui:pause', this.setPaused, this)
    this.game.events.on('game-ui:restart', this.restartGame, this)
    this.game.events.on('game-ui:start', this.startGameplay, this)
    this.bubbles = this.add.group({ runChildUpdate: false })
    this.projectiles = this.physics.add.group({ maxSize: 8, allowGravity: false })

    this.add.image(WIDTH / 2, QUESTION_Y, 'question-panel')
      .setDisplaySize(430, 151)
      .setDepth(9)
    this.questionText = this.add.container(WIDTH / 2, QUESTION_Y).setDepth(10)
    this.feedbackText = this.add.text(WIDTH / 2, QUESTION_Y + 99, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#047857',
      stroke: '#ffffff', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(30)
    this.scoreText = this.add.text(38, HEIGHT - 58, '★ Điểm: 0', {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#713f12',
      backgroundColor: '#fef3c7', padding: { x: 18, y: 10 },
    }).setOrigin(0, 1).setDepth(30)
    this.progressText = this.add.text(WIDTH - 38, HEIGHT - 58, `1/${this.totalQuestions}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#312e81',
      backgroundColor: '#ffffff', padding: { x: 18, y: 10 },
    }).setOrigin(1, 1).setDepth(30)
    this.scoreText.setVisible(false)
    this.progressText.setVisible(false)
    this.createAmmoSelector()
    this.emitScore()

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

    this.shooter = new Shooter(this, WIDTH / 2, HUD_TOP - 57)
    this.add.image(282, HUD_TOP + 20, 'cappy')
      .setOrigin(0.5, 1)
      .setDisplaySize(165, 160)
      .setDepth(19)
    this.bubbleSpawner = new BubbleSpawner(this, {
      width: WIDTH,
      height: HEIGHT,
      getActiveBubbles: () => this.bubbles.getChildren() as Bubble[],
      addBubble: (bubble) => this.bubbles.add(bubble),
    })
    this.createWolf()

    this.input.on('pointermove', this.aim, this)
    this.input.on('pointerdown', this.aim, this)
    this.input.on('pointerup', this.shoot, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)

    this.game.events.emit('bubble-shooter:ready')
    if (this.game.registry.get('game-ui:started')) this.startGameplay()
  }

  update(time: number, delta: number) {
    if (!this.gameStarted || this.isPauseMenuOpen) return

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
    this.add.image(WIDTH / 2, HEIGHT / 2, 'game-background')
      .setDisplaySize(WIDTH, HEIGHT)
      .setDepth(-100)

    const texture = this.add.graphics()
    texture.fillStyle(0xffffff).fillCircle(9, 9, 9)
    texture.generateTexture('math-projectile', 18, 18)
    texture.destroy()
  }

  private setMuted(muted: boolean) {
    this.sound.mute = muted
    if (!muted && this.gameStarted) this.ensureBackgroundMusic()
  }

  private setPaused(paused: boolean) {
    this.isPauseMenuOpen = paused
    if (paused) {
      this.physics.pause()
      this.time.paused = true
      this.tweens.pauseAll()
      return
    }
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.resume()
  }

  private emitScore() {
    this.game.events.emit('game-ui:score', this.score.current)
  }

  private setupAudio() {
    this.backgroundMusic = this.sound.add('voice-background', {
      loop: true,
      volume: 0.28,
    })
    this.voiceManager = new GameVoiceManager(this.sound, [
      ...(this.lesson.introVoice ? [{ key: 'voice-intro' }] : []),
      { key: 'voice-true-1' },
      { key: 'voice-true-2' },
      { key: 'voice-true-3' },
      { key: 'voice-true-4' },
      { key: 'voice-true-5' },
      { key: 'voice-false-1' },
      { key: 'voice-false-2' },
      { key: 'voice-false-3' },
      { key: 'voice-false-4' },
      { key: 'voice-false-5' },
      { key: 'voice-win', volume: 0.9 },
      { key: 'voice-wolf-haha', volume: 0.9 },
    ])
  }

  private async startGameplay() {
    if (this.gameStarted) return
    this.gameStarted = true
    this.game.registry.set('game-ui:started', true)
    const loadedQuestions = await this.lesson.loadQuestions()
    if (!this.sys.isActive()) return
    this.questions = new QuestionSystem(loadedQuestions.slice(0, this.totalQuestions))
    this.tracker = this.lesson.tracking ? createGameTracker(this.lesson.tracking) : undefined
    this.prepareWolfRounds()
    this.ensureBackgroundMusic()
    if (this.lesson.introVoice) this.scheduleTransition(500, () => {
      this.voiceManager?.playOnce('intro', 'voice-intro', 'intro')
    })
    this.startQuestion()
  }

  private ensureBackgroundMusic() {
    if (this.sound.mute || this.backgroundMusic?.isPlaying) return
    this.backgroundMusic?.play()
  }

  private restartGame() {
    this.gameStarted = false
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.resume()
    this.score.reset()
    this.emitScore()
    this.questionNumber = 1
    this.wolfRounds.clear()
    this.selectedAmmo = 0
    this.isPauseMenuOpen = false
    this.scene.restart()
  }

  private createAmmoSelector() {
    const leftX = 12
    const leftWidth = 220

    this.add.graphics()
      .fillStyle(0x123b62, 0.92)
      .fillRoundedRect(leftX, 1202, leftWidth, 66, 22)
      .lineStyle(3, 0x80d9ff, 0.85)
      .strokeRoundedRect(leftX, 1202, leftWidth, 66, 22)
      .setDepth(44)

    const ammoXs = [52, 122, 192]
    this.ammoSelectionRings = ammoXs.map((x, frame) => {
      const ring = this.add.circle(x, 1235, 25, 0x071f3d, 0.85)
        .setStrokeStyle(frame === this.selectedAmmo ? 5 : 2, frame === this.selectedAmmo ? 0xffd43b : 0x9bdcff)
        .setDepth(45)
      this.add.image(x, 1235, 'ammo', frame)
        .setDisplaySize(frame === 0 ? 29 : 39, frame === 0 ? 44 : 39)
        .setDepth(46)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectAmmo(frame))
      return ring
    })
    this.updateLevelHud()
  }

  private updateLevelHud() {
    this.game.events.emit('game-ui:round', this.questionNumber)
  }

  private createBottomHud() {
    const panelWidth = WIDTH / 3 - 10
    const panelHeight = HEIGHT - HUD_TOP - 8
    const panelY = HUD_TOP + panelHeight / 2

    ;[WIDTH / 6, WIDTH / 2, WIDTH * 5 / 6].forEach((x) => {
      this.add.graphics()
        .fillStyle(0x123b62, 0.9)
        .fillRoundedRect(x - panelWidth / 2, HUD_TOP, panelWidth, panelHeight, 24)
        .lineStyle(4, 0x80d9ff, 0.85)
        .strokeRoundedRect(x - panelWidth / 2, HUD_TOP, panelWidth, panelHeight, 24)
        .setDepth(44)
    })

    this.add.text(WIDTH / 6, HUD_TOP + 15, 'CHỌN ĐẠN', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(46)

    const ammoXs = [54, 120, 186]
    this.ammoSelectionRings = ammoXs.map((x, frame) => {
      const ring = this.add.circle(x, panelY + 16, 27, 0x071f3d, 0.82)
        .setStrokeStyle(frame === this.selectedAmmo ? 5 : 2, frame === this.selectedAmmo ? 0xffd43b : 0x9bdcff)
        .setDepth(45)
      this.add.image(x, panelY + 16, 'ammo', frame)
        .setDisplaySize(frame === 0 ? 31 : 42, frame === 0 ? 47 : 42)
        .setDepth(46)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectAmmo(frame))
      return ring
    })

    this.add.text(WIDTH / 2, HUD_TOP + 18, 'ĐIỂM', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(46)
    this.scoreText = this.add.text(WIDTH / 2, panelY + 18, '★  0', {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#ffd43b',
      stroke: '#7c3f00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46)

    this.add.text(WIDTH * 5 / 6, HUD_TOP + 18, 'MÀN', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(46)
    this.progressText = this.add.text(WIDTH * 5 / 6, panelY + 18, `1/${this.totalQuestions}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#102a55', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46)
  }

  private selectAmmo(frame: number) {
    if (!this.gameStarted) return
    this.selectedAmmo = frame
    this.ammoSelectionRings.forEach((ring, index) => {
      ring.setStrokeStyle(index === frame ? 5 : 2, index === frame ? 0xffd43b : 0x9bdcff)
    })
  }

  private startQuestion() {
    this.roundState = 'PLAYING'
    this.clearRound()
    this.currentQuestion = this.questions!.next()
    if (this.currentQuestion.learningKey) {
      this.tracker?.startQuestion({
        learningKey: this.currentQuestion.learningKey,
        expectedAnswer: this.currentQuestion.answer,
      })
    }
    this.renderQuestion(this.currentQuestion.text)
    this.feedbackText.setText('')
    this.progressText.setText(`${this.questionNumber}/${this.totalQuestions}`)
    this.updateLevelHud()
    this.nextButton.setVisible(false)
    this.locked = false
    this.bubbleSpawner.start(this.currentQuestion)
    this.beginWolfRound()
  }

  private createWolf() {
    if (!this.anims.exists('bubble-wolf-peek')) {
      this.anims.create({
        key: 'bubble-wolf-peek',
        frames: this.anims.generateFrameNumbers('wolf', { frames: [0, 1] }),
        frameRate: 2,
        repeat: 0,
        yoyo: true,
      })
    }
    this.wolf = this.add.sprite(WIDTH + 150, 1100, 'wolf', 0)
      .setDisplaySize(300, 300)
      .setDepth(13)
      .setVisible(false)
  }

  private beginWolfRound() {
    this.clearWolfAction()
    if (!this.wolf || !this.wolfRounds.has(this.questionNumber)) return
    this.wolf.setPosition(WIDTH - 72, 1100).setVisible(false)
    this.wolfShotTimer = this.time.delayedCall(4000, () => {
      this.wolfShotTimer = undefined
      if (this.roundState !== 'PLAYING' || !this.wolf) return
      this.wolf.setVisible(true).play('bubble-wolf-peek', true)
      this.scheduleWolfShot(3000)
    })
  }

  private prepareWolfRounds() {
    const eligibleRounds = Phaser.Utils.Array.Shuffle([3, 4, 5, 6, 7, 8, 9, 10])
    this.wolfRounds = new Set(eligibleRounds.slice(0, 4))
  }

  private scheduleWolfShot(delay = Phaser.Math.Between(4500, 8000)) {
    this.wolfShotTimer?.remove(false)
    this.wolfShotTimer = this.time.delayedCall(delay, () => {
      this.wolfShotTimer = undefined
      this.fireWolfArrow()
    })
  }

  private fireWolfArrow() {
    if (this.roundState !== 'PLAYING' || this.isPauseMenuOpen) return
    const targets = (this.bubbles.getChildren() as Bubble[]).filter((bubble) => bubble.active)
    const target = Phaser.Utils.Array.GetRandom(targets)
    if (!target) {
      this.scheduleWolfShot(1000)
      return
    }

    this.wolfBusy = true
    this.wolf?.stop()
    this.wolf?.setFrame(2)
    const targetX = target.x
    const targetY = target.y
    this.scheduleWolfAction(450, () => {
      if (this.roundState !== 'PLAYING' || !target.active) {
        this.wolfBusy = false
        this.wolf?.setFrame(0)
        if (this.roundState === 'PLAYING') this.scheduleWolfShot(1000)
        return
      }

      this.wolf?.setFrame(4)
      const startX = WIDTH - 180
      const startY = 1010
      const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY)
      this.wolfArrow?.destroy()
      this.wolfArrow = this.add.triangle(startX, startY, 0, -7, 30, 0, 0, 7, 0xef4444)
        .setStrokeStyle(3, 0x7f1d1d)
        .setRotation(angle)
        .setDepth(24)

      this.tweens.add({
        targets: this.wolfArrow,
        x: targetX,
        y: targetY,
        duration: 520,
        ease: 'Linear',
        onComplete: () => {
          this.wolfArrow?.destroy()
          this.wolfArrow = undefined
          if (this.roundState !== 'PLAYING' || !target.active) {
            this.wolfBusy = false
            this.wolf?.setFrame(0)
            this.scheduleWolfShot(1000)
            return
          }
          this.pop(target, false)
          this.wolf?.setFrame(5)
          this.voiceManager?.play('voice-wolf-haha', 'true')
          this.showWolfLaugh()
          this.scheduleWolfAction(1100, () => {
            this.wolfBusy = false
            if (this.roundState !== 'PLAYING' || !this.wolf) return
            this.tweens.add({
              targets: this.wolf,
              x: WIDTH + 150,
              duration: 450,
              ease: 'Cubic.In',
              onComplete: () => this.wolf?.setVisible(false),
            })
          })
        },
      })
    })
  }

  private showWolfLaugh() {
    const laugh = this.add.text(WIDTH - 120, 915, 'HA HA!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '34px',
      color: '#facc15',
      stroke: '#7c2d12',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(60)
    this.tweens.add({
      targets: laugh,
      y: laugh.y - 55,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.Out',
      onComplete: () => laugh.destroy(),
    })
  }

  private scheduleWolfAction(delay: number, callback: () => void) {
    let timer!: Phaser.Time.TimerEvent
    timer = this.time.delayedCall(delay, () => {
      this.wolfActionTimers.delete(timer)
      callback()
    })
    this.wolfActionTimers.add(timer)
  }

  private clearWolfAction() {
    this.wolfBusy = false
    this.wolfShotTimer?.remove(false)
    this.wolfShotTimer = undefined
    this.wolfActionTimers.forEach((timer) => timer.remove(false))
    this.wolfActionTimers.clear()
    if (this.wolfArrow?.active) {
      this.tweens.killTweensOf(this.wolfArrow)
      this.wolfArrow.destroy()
    }
    this.wolfArrow = undefined
    if (this.wolf?.active && this.wolf.anims) {
      this.tweens.killTweensOf(this.wolf)
      this.wolf.stop().setFrame(0).setVisible(false)
    }
  }

  private renderQuestion(question: string, showCheck = false) {
    this.questionText.removeAll(true)

    const tokens = question.split(/\s+/).filter(Boolean)
    const palette = Phaser.Utils.Array.Shuffle([
      '#2563eb', // xanh dương
      '#22c55e', // xanh lá
      '#a855f7', // tím
      '#f59e0b', // cam
      '#0891b2', // xanh ngọc
    ])
    const gap = 14
    const labels = tokens.map((token, index) => {
      const label = this.add.text(0, 0, token, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '58px',
        fontStyle: 'bold',
        color: token === '?' ? '#ef2f36' : token === '✓' ? '#22c55e' : palette[index % palette.length],
        stroke: '#ffffff',
        strokeThickness: 4,
      }).setOrigin(0.5)
      label.setShadow(0, 3, 'rgba(49, 46, 129, 0.22)', 3)
      return label
    })

    const totalWidth = labels.reduce((width, label) => width + label.width, 0) + gap * (labels.length - 1)
    let cursor = -totalWidth / 2
    labels.forEach((label) => {
      label.setX(cursor + label.width / 2)
      cursor += label.width + gap
      this.questionText.add(label)
    })

    // Dấu check là overlay nằm ngoài phép tính, không tham gia tính totalWidth nên
    // khi xuất hiện sẽ không đẩy toàn bộ dãy chữ sang trái.
    if (showCheck) {
      const check = this.add.text(totalWidth / 2 + 5, 0, '✓', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#22c55e',
        stroke: '#ffffff',
        strokeThickness: 4,
      }).setOrigin(0, 0.5)
      check.setShadow(0, 3, 'rgba(21, 128, 61, 0.2)', 3)
      this.questionText.add(check)
    }
  }

  private aim(pointer: Phaser.Input.Pointer) {
    if (!this.gameStarted) return
    this.shooter.setAim(pointer.worldX, pointer.worldY)
  }

  private shoot(pointer: Phaser.Input.Pointer) {
    if (!this.gameStarted || this.isPauseMenuOpen || pointer.worldY >= HUD_TOP) return
    if (pointer.worldY <= 82 && pointer.worldX >= WIDTH - 140) return
    this.aim(pointer)
    if (this.roundState !== 'PLAYING' || this.time.now - this.lastShotAt < 320 || this.projectiles.countActive(true) >= 8) return
    this.lastShotAt = this.time.now
    const shot = this.shooter.shot
    const projectile = this.projectiles.create(shot.x, shot.y, 'ammo', this.selectedAmmo) as Phaser.Physics.Arcade.Image
    const projectileSize = this.selectedAmmo === 0 ? { width: 28, height: 42 } : { width: 34, height: 34 }
    projectile.setDisplaySize(projectileSize.width, projectileSize.height).setCircle(9).setDepth(15)
    if (this.selectedAmmo === 0) projectile.setRotation(shot.angle + Math.PI / 2)
    projectile.setVelocity(Math.cos(shot.angle) * 940, Math.sin(shot.angle) * 940)
    const shotVoices = ['voice-bullet-rocket', 'voice-bullet-bomb', 'voice-bullet-bubble']
    this.sound.play(shotVoices[this.selectedAmmo], { volume: 0.55 })
  }

  private playRandomVoice(keys: string[], priority: VoicePriority) {
    this.voiceManager?.play(Phaser.Utils.Array.GetRandom(keys), priority)
  }

  private handleHitFlow(projectileObject: unknown, bubbleObject: unknown) {
    const projectile = projectileObject as Phaser.Physics.Arcade.Image
    const bubble = bubbleObject as Bubble
    if (!projectile.active || !bubble.active || this.roundState !== 'PLAYING') return

    projectile.destroy()
    const hitX = bubble.x
    const hitY = bubble.y

    if (bubble.value !== this.currentQuestion.answer) {
      if (this.currentQuestion.learningKey) {
        this.tracker?.recordAnswer({
          learningKey: this.currentQuestion.learningKey,
          correct: false,
          expectedAnswer: this.currentQuestion.answer,
          selectedAnswer: bubble.value,
        })
      }
      this.playRandomVoice(
        ['voice-false-1', 'voice-false-2', 'voice-false-3', 'voice-false-4', 'voice-false-5'],
        'false',
      )
      const { score, deducted } = this.score.wrong()
      this.emitScore()
      this.scoreText.setText(`★  ${score}`)
      this.pop(bubble, false)
      this.showFloatingScore(hitX, hitY, deducted ? '-2' : '0', '#fb7185')
      return
    }

    this.roundState = 'CORRECT'
    this.locked = true
    this.bubbleSpawner.pause()
    this.projectiles.clear(true, true)
    if (this.currentQuestion.learningKey) {
      this.tracker?.recordAnswer({
        learningKey: this.currentQuestion.learningKey,
        correct: true,
        expectedAnswer: this.currentQuestion.answer,
        selectedAnswer: bubble.value,
      })
    }
    if (this.questionNumber !== this.totalQuestions) {
      this.playRandomVoice(
        ['voice-true-1', 'voice-true-2', 'voice-true-3', 'voice-true-4', 'voice-true-5'],
        'true',
      )
    }
    const score = this.score.correct()
    this.emitScore()
    this.scoreText.setText(`★  ${score}`)
    this.pop(bubble, true)
    this.showFloatingScore(hitX, hitY, '+10 ★', '#facc15')

    this.scheduleTransition(300, () => this.showCorrectAnswer())
    this.scheduleTransition(1100, () => this.beginRoundTransition())
  }

  private showFloatingScore(x: number, y: number, value: string, color: string) {
    const label = this.add.text(x, y - 12, value, {
      fontFamily: 'Arial, sans-serif', fontSize: '30px', fontStyle: 'bold', color,
      stroke: '#ffffff', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(60)
    this.tweens.add({
      targets: label,
      y: y - 82,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.Out',
      onComplete: () => label.destroy(),
    })
  }

  private showCorrectAnswer() {
    if (this.roundState !== 'CORRECT') return
    this.roundState = 'SHOW_RESULT'
    this.renderQuestion(this.currentQuestion.text.replace('?', `${this.currentQuestion.answer}`), true)
    this.questionText.setScale(1)
    this.tweens.add({
      targets: this.questionText,
      scale: 1.06,
      duration: 180,
      yoyo: true,
      ease: 'Sine.InOut',
    })
  }

  private beginRoundTransition() {
    if (this.roundState !== 'SHOW_RESULT') return
    this.roundState = 'ROUND_TRANSITION'
    this.clearWolfAction()
    this.fadeOldRound()
    this.tweens.add({
      targets: this.questionText,
      x: WIDTH / 2 - 90,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.In',
    })

    if (this.questionNumber === this.totalQuestions) {
      this.scheduleTransition(650, () => this.finishGame())
      return
    }

    this.scheduleTransition(380, () => this.showNextQuestion())
  }

  private fadeOldRound() {
    this.projectiles.clear(true, true)
    this.bubbles.getChildren().forEach((item) => {
      const bubble = item as Bubble
      if (!bubble.active) return
      this.tweens.add({
        targets: bubble,
        y: bubble.y - 150,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.In',
        onComplete: () => bubble.destroy(),
      })
    })
  }

  private showNextQuestion() {
    if (this.roundState !== 'ROUND_TRANSITION') return
    this.roundState = 'NEW_QUESTION'
    this.bubbles.clear(true, true)
    this.projectiles.clear(true, true)
    this.questionNumber += 1
    this.showLevelTransitionLabel()
    this.currentQuestion = this.questions!.next()
    if (this.currentQuestion.learningKey) {
      this.tracker?.startQuestion({
        learningKey: this.currentQuestion.learningKey,
        expectedAnswer: this.currentQuestion.answer,
      })
    }
    this.updateLevelHud()
    this.animateProgress()
    this.renderQuestion(this.currentQuestion.text)
    this.questionText.setPosition(WIDTH / 2 + 90, QUESTION_Y).setAlpha(0).setScale(0.9)
    this.tweens.add({
      targets: this.questionText,
      x: WIDTH / 2,
      alpha: 1,
      scale: 1,
      duration: 480,
      ease: 'Back.Out',
      onComplete: () => {
        if (this.roundState !== 'NEW_QUESTION') return
        this.roundState = 'PLAYING'
        this.locked = false
        this.bubbleSpawner.start(this.currentQuestion)
        this.beginWolfRound()
      },
    })
  }

  private showLevelTransitionLabel() {
    this.transitionLabel?.destroy()
    const label = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, `Màn ${this.questionNumber}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#2563eb',
      strokeThickness: 9,
    }).setOrigin(0.5).setDepth(100).setAlpha(0).setScale(0.96)
    this.transitionLabel = label

    this.tweens.add({
      targets: label,
      alpha: 1,
      scale: 1,
      duration: 420,
      ease: 'Sine.Out',
      onComplete: () => {
        this.tweens.add({
          targets: label,
          alpha: 0,
          delay: 180,
          duration: 1260,
          ease: 'Sine.InOut',
          onComplete: () => {
            label.destroy()
            if (this.transitionLabel === label) this.transitionLabel = undefined
          },
        })
      },
    })
  }

  private animateProgress() {
    this.game.events.emit('game-ui:round', this.questionNumber)
  }

  private finishGame() {
    if (this.roundState !== 'ROUND_TRANSITION') return
    this.roundState = 'COMPLETE'
    this.feedbackText.setColor('#047857').setText(`Hoàn thành!  ★ ${this.score.current}`)
    this.feedbackText.setAlpha(0).setScale(0.9)
    this.tweens.add({ targets: this.feedbackText, alpha: 1, scale: 1, duration: 350, ease: 'Back.Out' })
    const trackingTask = this.tracker?.finishSession(this.score.current)
    this.game.events.emit('game-ui:complete', this.score.current, trackingTask)
    this.winVoiceTimer = setTimeout(() => {
      this.winVoiceTimer = undefined
      this.voiceManager?.playOnce('win', 'voice-win', 'win')
    }, 500)
  }

  private scheduleTransition(delay: number, callback: () => void) {
    let timer!: Phaser.Time.TimerEvent
    timer = this.time.delayedCall(delay, () => {
      this.transitionTimers.delete(timer)
      callback()
    })
    this.transitionTimers.add(timer)
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
      this.emitScore()
      this.feedbackText.setColor('#047857').setText('Chính xác! +10 ★')
      this.pop(bubble, true)
      this.scoreText.setText(this.scoreText.text.replace(/^.*?:\s*/, '★  '))
      this.nextButtonLabel.setText(this.questionNumber === this.totalQuestions ? 'Chơi lại  ↻' : 'Tiếp theo  →')
      this.nextButton.setVisible(true)
    } else {
      const { score, deducted } = this.score.wrong()
      this.emitScore()
      this.scoreText.setText(`★ Điểm: ${score}`)
      this.feedbackText.setColor('#be123c').setText(deducted ? 'Chưa đúng! -2' : 'Thử lại nhé!')
      this.pop(bubble, false)
      this.scoreText.setText(this.scoreText.text.replace(/^.*?:\s*/, '★  '))
      this.time.delayedCall(650, () => {
        if (!this.locked) this.feedbackText.setText('')
      })
    }
  }

  private checkProjectileHits() {
    if (this.roundState !== 'PLAYING') return
    const projectiles = this.projectiles.getChildren() as Phaser.Physics.Arcade.Image[]
    const bubbles = this.bubbles.getChildren() as Bubble[]

    for (const projectile of projectiles) {
      if (!projectile.active) continue
      for (const bubble of bubbles) {
        if (!bubble.active || bubble.y > BUBBLE_CONFIG.shooterSafeTop) continue
        const hitDistance = bubble.hitRadius + 9
        if (Phaser.Math.Distance.Squared(projectile.x, projectile.y, bubble.x, bubble.y) <= hitDistance * hitDistance) {
          this.handleHitFlow(projectile, bubble)
          break
        }
      }
    }
  }

  private goToNextQuestion() {
    if (!this.locked) return
    this.questionNumber = this.questionNumber === this.totalQuestions ? 1 : this.questionNumber + 1
    this.startQuestion()
  }

  private pop(bubble: Bubble, correct: boolean) {
    this.sound.play('voice-bubble-pop', { volume: 0.65 })
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
    if (this.winVoiceTimer) clearTimeout(this.winVoiceTimer)
    this.winVoiceTimer = undefined
    this.clearWolfAction()
    this.wolf = undefined
    this.transitionTimers.forEach((timer) => timer.remove(false))
    this.transitionTimers.clear()
    this.transitionLabel?.destroy()
    this.transitionLabel = undefined
    this.sound.off(Phaser.Sound.Events.UNLOCKED, this.ensureBackgroundMusic, this)
    this.backgroundMusic?.destroy()
    this.backgroundMusic = undefined
    this.voiceManager?.destroy()
    this.voiceManager = undefined
    this.bubbleSpawner?.destroy()
    this.input.off('pointermove', this.aim, this)
    this.input.off('pointerdown', this.aim, this)
    this.input.off('pointerup', this.shoot, this)
    this.nextButton?.off('pointerdown', this.goToNextQuestion, this)
    this.game.events.off('game-ui:mute', this.setMuted, this)
    this.game.events.off('game-ui:pause', this.setPaused, this)
    this.game.events.off('game-ui:restart', this.restartGame, this)
    this.game.events.off('game-ui:start', this.startGameplay, this)
  }
}
