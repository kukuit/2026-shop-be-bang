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
const TOTAL_QUESTIONS = 10
const HUD_TOP = 1182
type RoundState = 'PLAYING' | 'CORRECT' | 'SHOW_RESULT' | 'ROUND_TRANSITION' | 'NEW_QUESTION' | 'COMPLETE'

export class BubbleMathScene extends Phaser.Scene {
  private readonly questions = new QuestionSystem()
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
  private pauseMenu?: Phaser.GameObjects.Container
  private isPauseMenuOpen = false
  private voiceButton?: Phaser.GameObjects.Image
  private voiceMutedMark?: Phaser.GameObjects.Text
  private backgroundMusic?: Phaser.Sound.BaseSound

  constructor() {
    super('BubbleMathScene')
  }

  preload() {
    this.load.on('progress', (progress: number) => {
      this.game.events.emit('bubble-shooter:load-progress', progress)
    })

    this.load.image('game-background', '/games/phaser/images/background.png')
    this.load.image('cannon-base', '/games/phaser/images/cannon-base.png')
    this.load.image('cannon-barrel', '/games/phaser/images/cannon-barrel.png')
    this.load.image('question-panel', '/games/phaser/images/question-panel.png')
    this.load.image('player-card', '/games/phaser/images/player-card.png')
    this.load.image('player-avatar', '/games/phaser/images/player-avatar.png')
    this.load.image('balloon', '/games/phaser/images/balloon.png')
    this.load.spritesheet('ammo', '/games/phaser/images/ammo.png', {
      frameWidth: 724,
      frameHeight: 724,
    })
    this.load.spritesheet('ui-icons', '/games/phaser/images/ui-icons.png', {
      frameWidth: 724,
      frameHeight: 724,
    })
    this.load.audio('voice-background', '/games/phaser/voices/background.mp3')
    this.load.audio('voice-bullet-rocket', '/games/phaser/voices/bullet-rocket.mp3')
    this.load.audio('voice-bullet-bomb', '/games/phaser/voices/bullet-bomb.mp3')
    this.load.audio('voice-bullet-bubble', '/games/phaser/voices/bullet-bubble.mp3')
  }

  create() {
    this.setupAudio()
    this.drawBackground()
    this.createPlayerCard()
    this.createTopControls()
    this.bubbles = this.add.group({ runChildUpdate: false })
    this.projectiles = this.physics.add.group({ maxSize: 8, allowGravity: false })

    this.add.image(WIDTH / 2, 116, 'question-panel')
      .setDisplaySize(430, 151)
      .setDepth(9)
    this.questionText = this.add.container(WIDTH / 2, 116).setDepth(10)
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
    this.scoreText.setVisible(false)
    this.progressText.setVisible(false)
    this.createBottomHudV2()

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
    this.game.events.emit('bubble-shooter:ready')
  }

  update(time: number, delta: number) {
    if (this.isPauseMenuOpen) return

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

  private createTopControls() {
    this.voiceButton = this.add.image(WIDTH - 98, 42, 'ui-icons', 0)
      .setDisplaySize(56, 56)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
      .setName('Bật hoặc tắt âm thanh')
      .on('pointerdown', this.toggleVoice, this)

    this.voiceMutedMark = this.add.text(WIDTH - 98, 42, '/', {
      fontFamily: 'Arial, sans-serif', fontSize: '52px', fontStyle: 'bold', color: '#ef4444',
      stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(51).setVisible(this.sound.mute)
    this.voiceButton.setTint(this.sound.mute ? 0x94a3b8 : 0xffffff)

    const backBackground = this.add.circle(0, 0, 28, 0x2563eb, 1)
      .setStrokeStyle(4, 0xffffff, 1)
    const backArrow = this.add.text(0, -2, '←', {
      fontFamily: 'Arial, sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    this.add.container(WIDTH - 30, 42, [backBackground, backArrow])
      .setSize(56, 56)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
      .setName('Quay lại')
      .on('pointerdown', this.openPauseMenu, this)
  }

  private toggleVoice() {
    this.sound.mute = !this.sound.mute
    this.voiceButton?.setTint(this.sound.mute ? 0x94a3b8 : 0xffffff)
    this.voiceMutedMark?.setVisible(this.sound.mute)
    if (!this.sound.mute) this.ensureBackgroundMusic()
  }

  private setupAudio() {
    this.backgroundMusic = this.sound.add('voice-background', {
      loop: true,
      volume: 0.28,
    })

    // Phaser sẽ tự unlock Web Audio ở thao tác người dùng đầu tiên. Việc gọi play
    // khi còn locked giúp bài nhạc được xếp hàng và phát ngay sau khi unlock.
    this.sound.once(Phaser.Sound.Events.UNLOCKED, this.ensureBackgroundMusic, this)
    this.input.once('pointerdown', this.ensureBackgroundMusic, this)
    this.ensureBackgroundMusic()
  }

  private ensureBackgroundMusic() {
    if (this.sound.mute || this.backgroundMusic?.isPlaying) return
    this.backgroundMusic?.play()
  }

  private openPauseMenu() {
    if (this.isPauseMenuOpen) return
    this.isPauseMenuOpen = true
    this.physics.pause()
    this.time.paused = true
    this.tweens.pauseAll()

    const overlay = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x07152a, 0.68).setOrigin(0)
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 560, 650, 0xffffff, 0.98)
      .setStrokeStyle(8, 0xffc928, 1)
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 245, 'Tạm dừng', {
      fontFamily: 'Arial, sans-serif', fontSize: '52px', fontStyle: 'bold', color: '#2563eb',
    }).setOrigin(0.5)
    const buttons = [
      this.createPauseMenuButton(-135, 'Tiếp tục chơi', 0x22c55e, this.closePauseMenu),
      this.createPauseMenuButton(-25, 'Chơi lại', 0xf59e0b, this.restartGame),
      this.createPauseMenuButton(85, 'Về game', 0x7c3aed, () => this.navigateTo('/game')),
      this.createPauseMenuButton(195, 'Về Shop Bé Băng', 0x2563eb, () => this.navigateTo('/')),
    ]
    this.pauseMenu = this.add.container(0, 0, [overlay, panel, title, ...buttons]).setDepth(200)
  }

  private createPauseMenuButton(offsetY: number, label: string, color: number, action: () => void) {
    const background = this.add.rectangle(0, 0, 430, 82, color, 1)
      .setStrokeStyle(4, 0xffffff, 0.95)
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '29px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    return this.add.container(WIDTH / 2, HEIGHT / 2 + offsetY, [background, text])
      .setSize(430, 82)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', action, this)
  }

  private closePauseMenu() {
    this.pauseMenu?.destroy(true)
    this.pauseMenu = undefined
    this.isPauseMenuOpen = false
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.resume()
  }

  private restartGame() {
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.resume()
    this.score.reset()
    this.questionNumber = 1
    this.selectedAmmo = 0
    this.isPauseMenuOpen = false
    this.pauseMenu = undefined
    this.scene.restart()
  }

  private navigateTo(path: string) {
    window.location.assign(path)
  }

  private createPlayerCard() {
    const x = 76
    const y = 42
    const width = 142
    const height = 62

    this.add.image(x, y, 'player-card')
      .setDisplaySize(width, height)
      .setDepth(50)
    this.add.image(30, y, 'player-avatar')
      .setDisplaySize(52, 52)
      .setDepth(51)
    this.add.text(103, y, 'Bé Băng', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#164e9b',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(51)
  }

  private createBottomHudV2() {
    const leftX = 12
    const leftWidth = 220
    const rightX = WIDTH - 232
    const rightWidth = 220

    this.add.graphics()
      .fillStyle(0x123b62, 0.92)
      .fillRoundedRect(leftX, 1202, leftWidth, 66, 22)
      .lineStyle(4, 0x80d9ff, 0.85)
      .strokeRoundedRect(leftX, 1202, leftWidth, 66, 22)
      .setDepth(44)

    this.add.graphics()
      .fillStyle(0x15518a, 1)
      .fillPoints([
        new Phaser.Geom.Point(42, 1188),
        new Phaser.Geom.Point(202, 1188),
        new Phaser.Geom.Point(212, 1216),
        new Phaser.Geom.Point(32, 1216),
      ], true)
      .lineStyle(3, 0x78d5ff, 0.9)
      .strokePoints([
        new Phaser.Geom.Point(42, 1188),
        new Phaser.Geom.Point(202, 1188),
        new Phaser.Geom.Point(212, 1216),
        new Phaser.Geom.Point(32, 1216),
      ], true)
      .setDepth(47)
    this.add.text(122, 1202, 'CHỌN ĐẠN', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(48)

    const ammoXs = [52, 122, 192]
    this.ammoSelectionRings = ammoXs.map((x, frame) => {
      const ring = this.add.circle(x, 1238, 25, 0x071f3d, 0.85)
        .setStrokeStyle(frame === this.selectedAmmo ? 5 : 2, frame === this.selectedAmmo ? 0xffd43b : 0x9bdcff)
        .setDepth(45)
      this.add.image(x, 1238, 'ammo', frame)
        .setDisplaySize(frame === 0 ? 29 : 39, frame === 0 ? 44 : 39)
        .setDepth(46)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectAmmo(frame))
      return ring
    })

    this.add.graphics()
      .fillStyle(0x123b62, 0.94)
      .fillRoundedRect(260, 1215, 200, 55, 23)
      .lineStyle(4, 0xffb72b, 1)
      .strokeRoundedRect(260, 1215, 200, 55, 23)
      .setDepth(44)
    this.scoreText = this.add.text(WIDTH / 2, 1242, '★  0', {
      fontFamily: 'Arial, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffd43b',
      stroke: '#7c3f00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46)

    this.add.graphics()
      .fillStyle(0x123b62, 0.94)
      .fillRoundedRect(rightX, 1195, rightWidth, 75, 22)
      .lineStyle(4, 0x80d9ff, 0.85)
      .strokeRoundedRect(rightX, 1195, rightWidth, 75, 22)
      .setDepth(44)
    this.levelTitleText = this.add.text(rightX + rightWidth / 2, 1208, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(46)
    this.add.graphics()
      .fillStyle(0x071f3d, 0.92)
      .fillRoundedRect(rightX + 20, 1221, rightWidth - 40, 21, 11)
      .lineStyle(2, 0x07152a, 0.8)
      .strokeRoundedRect(rightX + 20, 1221, rightWidth - 40, 21, 11)
      .setDepth(45)
    this.levelProgressFill = this.add.graphics().setDepth(46)
    this.levelProgressStar = this.add.text(0, 1231, '★', {
      fontFamily: 'Arial, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffd43b',
      stroke: '#a75b00', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(47)
    this.progressText = this.add.text(rightX + rightWidth / 2, 1257, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(46)
    this.updateLevelHud()
  }

  private updateLevelHud() {
    const barX = WIDTH - 212
    const barWidth = 180
    const progress = this.questionNumber / TOTAL_QUESTIONS
    const fillWidth = Math.max(14, barWidth * progress)
    this.levelTitleText.setText(`MÀN ${this.questionNumber}`)
    this.progressText.setText(`${this.questionNumber}/${TOTAL_QUESTIONS}`)
    this.levelProgressFill.clear()
      .fillStyle(0xff9f1c, 1)
      .fillRoundedRect(barX, 1223, fillWidth, 17, 9)
    this.levelProgressStar.setX(barX + fillWidth)
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
    this.progressText = this.add.text(WIDTH * 5 / 6, panelY + 18, `1/${TOTAL_QUESTIONS}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#102a55', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46)
  }

  private selectAmmo(frame: number) {
    this.selectedAmmo = frame
    this.ammoSelectionRings.forEach((ring, index) => {
      ring.setStrokeStyle(index === frame ? 5 : 2, index === frame ? 0xffd43b : 0x9bdcff)
    })
  }

  private startQuestion() {
    this.roundState = 'PLAYING'
    this.clearRound()
    this.currentQuestion = this.questions.next()
    this.renderQuestion(this.currentQuestion.text)
    this.feedbackText.setText('')
    this.progressText.setText(`${this.questionNumber}/${TOTAL_QUESTIONS}`)
    this.updateLevelHud()
    this.nextButton.setVisible(false)
    this.locked = false
    this.bubbleSpawner.start(this.currentQuestion)
  }

  private renderQuestion(question: string) {
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
        fontFamily: 'Arial, sans-serif',
        fontSize: '58px',
        fontStyle: 'bold',
        color: token === '?' ? '#ef2f36' : token === '✓' ? '#22c55e' : palette[index % palette.length],
        stroke: '#ffffff',
        strokeThickness: 3,
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
  }

  private aim(pointer: Phaser.Input.Pointer) {
    this.shooter.setAim(pointer.worldX, pointer.worldY)
  }

  private shoot(pointer: Phaser.Input.Pointer) {
    if (this.isPauseMenuOpen || pointer.worldY >= HUD_TOP) return
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

  private handleHitFlow(projectileObject: unknown, bubbleObject: unknown) {
    const projectile = projectileObject as Phaser.Physics.Arcade.Image
    const bubble = bubbleObject as Bubble
    if (!projectile.active || !bubble.active || this.roundState !== 'PLAYING') return

    projectile.destroy()
    const hitX = bubble.x
    const hitY = bubble.y

    if (bubble.value !== this.currentQuestion.answer) {
      const { score, deducted } = this.score.wrong()
      this.scoreText.setText(`★  ${score}`)
      this.pop(bubble, false)
      this.showFloatingScore(hitX, hitY, deducted ? '-2' : '0', '#fb7185')
      return
    }

    this.roundState = 'CORRECT'
    this.locked = true
    this.bubbleSpawner.pause()
    this.projectiles.clear(true, true)
    const score = this.score.correct()
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
    this.renderQuestion(this.currentQuestion.text.replace('?', `${this.currentQuestion.answer} ✓`))
    this.questionText.setScale(1)
    this.tweens.add({
      targets: this.questionText,
      scale: 1.15,
      duration: 180,
      yoyo: true,
      ease: 'Sine.InOut',
    })
  }

  private beginRoundTransition() {
    if (this.roundState !== 'SHOW_RESULT') return
    this.roundState = 'ROUND_TRANSITION'
    this.fadeOldRound()
    this.tweens.add({
      targets: this.questionText,
      x: WIDTH / 2 - 90,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.In',
    })

    if (this.questionNumber === TOTAL_QUESTIONS) {
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
    this.currentQuestion = this.questions.next()
    this.updateLevelHud()
    this.animateProgress()
    this.renderQuestion(this.currentQuestion.text)
    this.questionText.setPosition(WIDTH / 2 + 90, 116).setAlpha(0).setScale(0.9)
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
    this.tweens.add({
      targets: [this.progressText, this.levelTitleText, this.levelProgressStar],
      scale: 1.15,
      duration: 150,
      yoyo: true,
      ease: 'Sine.InOut',
    })
  }

  private finishGame() {
    if (this.roundState !== 'ROUND_TRANSITION') return
    this.roundState = 'COMPLETE'
    this.feedbackText.setColor('#047857').setText(`Hoàn thành!  ★ ${this.score.current}`)
    this.feedbackText.setAlpha(0).setScale(0.9)
    this.tweens.add({ targets: this.feedbackText, alpha: 1, scale: 1, duration: 350, ease: 'Back.Out' })
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
      this.feedbackText.setColor('#047857').setText('Chính xác! +10 ★')
      this.pop(bubble, true)
      this.scoreText.setText(this.scoreText.text.replace(/^.*?:\s*/, '★  '))
      this.nextButtonLabel.setText(this.questionNumber === TOTAL_QUESTIONS ? 'Chơi lại  ↻' : 'Tiếp theo  →')
      this.nextButton.setVisible(true)
    } else {
      const { score, deducted } = this.score.wrong()
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
    this.transitionTimers.forEach((timer) => timer.remove(false))
    this.transitionTimers.clear()
    this.transitionLabel?.destroy()
    this.transitionLabel = undefined
    this.pauseMenu?.destroy(true)
    this.pauseMenu = undefined
    this.sound.off(Phaser.Sound.Events.UNLOCKED, this.ensureBackgroundMusic, this)
    this.input.off('pointerdown', this.ensureBackgroundMusic, this)
    this.backgroundMusic?.destroy()
    this.backgroundMusic = undefined
    this.bubbleSpawner?.destroy()
    this.input.off('pointermove', this.aim, this)
    this.input.off('pointerdown', this.aim, this)
    this.input.off('pointerup', this.shoot, this)
    this.nextButton?.off('pointerdown', this.goToNextQuestion, this)
  }
}
