import * as Phaser from 'phaser'
import { GAME_BACKGROUND_MUSIC } from '../general/audio'
import { GameVoiceManager, type VoicePriority } from '../general/GameVoiceManager'
import { ANSWER_PATH_OFFSETS, BOOST_SPEED, CAR_Y, CHECK_Y, GAME_HEIGHT, GAME_WIDTH, HIT_SPEED, HORIZON_Y, LANES, NORMAL_SPEED, carLaneX } from './constants'
import { RoadController } from './core/RoadController'
import { createRacingQuestionForTarget, createRacingQuestions, RACING_SUPPORTED_TARGETS } from './lessons/toan-1-bai-1'
import { RacingState, type Lane, type RacingQuestion, type RacingTrackingEvent } from './types'
import { createGameTracker, GAME_IDS, getRecognizeNumberKey, LESSON_IDS, type GameTracker } from '../general/tracking'
import { buildAdaptiveQuestions } from '../general/adaptive'

type AnswerGate = Phaser.GameObjects.Container & { answer: number; lane: Lane }
type WolfEventPhase = 'IDLE' | 'ENTERING' | 'APPROACHING' | 'PUSHING' | 'LAUGHING' | 'ESCAPING'

const shuffle = <T>(values: T[]) => Phaser.Utils.Array.Shuffle([...values])

export class RacingScene extends Phaser.Scene {
  private state = RacingState.RUNNING
  private questions: RacingQuestion[] = []
  private questionIndex = 0
  private attemptCount = 1
  private score = 0
  private currentLane: Lane = LANES.center
  private currentSpeed = NORMAL_SPEED
  private road!: RoadController
  private car!: Phaser.GameObjects.Container
  private gates: AnswerGate[] = []
  private gateY = HORIZON_Y
  private hasCheckedCurrentGate = false
  private questionPanel!: Phaser.GameObjects.Container
  private questionText!: Phaser.GameObjects.Container
  private hint!: Phaser.GameObjects.Container
  private paused = false
  private gameStarted = false
  private pointerStartX?: number
  private questionStartedAt = 0
  private music?: Phaser.Sound.BaseSound
  private engineSound?: Phaser.Sound.BaseSound
  private laneWhoosh?: Phaser.Sound.BaseSound
  private correctSfx?: Phaser.Sound.BaseSound
  private wrongSfx?: Phaser.Sound.BaseSound
  private voiceManager?: GameVoiceManager
  private wolfLaughSound?: Phaser.Sound.BaseSound
  private wolf?: Phaser.GameObjects.Sprite
  private wolfEventActive = false
  private wolfImpactActive = false
  private wolfEventPhase: WolfEventPhase = 'IDLE'
  private wolfTriggeredRounds = new Set<number>()
  private wolfTimers = new Set<Phaser.Time.TimerEvent>()
  private tracker?: GameTracker
  private adaptiveLoadGeneration = 0

  constructor() { super('RacingScene') }

  preload() {
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => this.game.events.emit('racing:progress', progress))
    this.load.audio('racing-background', GAME_BACKGROUND_MUSIC)
    this.load.audio('racing-engine-loop', '/games/racing/voices/engine-loop.mp3')
    this.load.audio('racing-lane-whoosh', '/games/racing/voices/whoosh.mp3')
    this.load.audio('racing-ting', '/games/racing/voices/ting.mp3')
    this.load.audio('racing-buzzer', '/games/racing/voices/buzzer.mp3')
    this.load.audio('racing-voice-intro', '/games/lessons/lop-1/toan/bai-1/racing/voices/intro.mp3')
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
    this.load.audio('racing-wolf-haha', '/games/general/voices/wolf-haha.mp3')
    this.load.image('racing-valley-road', '/games/racing/images/valley-road-v2.png')
    this.load.image('racing-cappy-car', '/games/racing/images/cappy-red-car.png')
    this.load.image('racing-answer-rock', '/games/racing/images/answer-rock.png')
    this.load.image('racing-answer-barrel', '/games/racing/images/answer-barrel.png')
    this.load.spritesheet('racing-wolf-states', '/games/racing/images/wolf-car-states.png', {
      frameWidth: 512,
      frameHeight: 512,
    })
  }

  create() {
    this.resetRuntimeState()
    this.questions = createRacingQuestions()
    this.road = new RoadController(this)
    this.road.create()
    this.createQuestionPanel()
    this.createCar()
    this.createControls()
    this.input.keyboard?.on('keydown-LEFT', this.onLeftKey, this)
    this.input.keyboard?.on('keydown-RIGHT', this.onRightKey, this)
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.game.events.on('game-ui:mute', this.setMuted, this)
    this.game.events.on('game-ui:pause', this.setPaused, this)
    this.game.events.on('game-ui:restart', this.restart, this)
    this.game.events.on('game-ui:start', this.startGameplay, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
    this.music = this.sound.add('racing-background', { loop: true, volume: .16 })
    this.engineSound = this.sound.add('racing-engine-loop', { loop: true, volume: .25 })
    this.laneWhoosh = this.sound.add('racing-lane-whoosh', { volume: .55 })
    this.correctSfx = this.sound.add('racing-ting', { volume: .65 })
    this.wrongSfx = this.sound.add('racing-buzzer', { volume: .65 })
    this.wolfLaughSound = this.sound.add('racing-wolf-haha', { volume: .85 })
    this.setupVoice()
    this.game.events.emit('game-ui:score', 0)
    this.game.events.emit('game-ui:round', 1)
    const loadGeneration = ++this.adaptiveLoadGeneration
    void this.loadAdaptiveQuestions(loadGeneration).then(() => {
      if (loadGeneration !== this.adaptiveLoadGeneration || !this.scene.isActive()) return
      this.game.events.emit('racing:ready')
      if (this.game.registry.get('game-ui:started')) this.startGameplay()
    })
  }

  private resetRuntimeState() {
    this.state = RacingState.RUNNING
    this.questionIndex = 0
    this.attemptCount = 1
    this.score = 0
    this.currentLane = LANES.center
    this.currentSpeed = NORMAL_SPEED
    this.gates = []
    this.gateY = HORIZON_Y
    this.hasCheckedCurrentGate = false
    this.paused = false
    this.gameStarted = false
    this.pointerStartX = undefined
    this.questionStartedAt = 0
    this.tracker = undefined
    this.wolf = undefined
    this.wolfEventActive = false
    this.wolfImpactActive = false
    this.wolfEventPhase = 'IDLE'
    this.wolfTriggeredRounds.clear()
    this.wolfTimers.clear()
  }

  update(_: number, delta: number) {
    if (!this.gameStarted || this.paused) return
    this.road.update(delta, this.currentSpeed)
    if (this.state === RacingState.RUNNING && this.gates.length) {
      this.gateY += delta * .105 * this.currentSpeed
      const progress = Phaser.Math.Clamp((this.gateY - HORIZON_Y) / (CHECK_Y - HORIZON_Y), 0, 1)
      // The painted lane boundaries are straight lines, so their centers expand
      // from the horizon toward the player. Side lanes use a calibrated Bezier
      // path to stay visually centered as the road widens.
      const perspective = progress
      const scale = Phaser.Math.Linear(.18, 1, perspective)
      this.gates.forEach((gate) => {
        const projectedX = this.projectGateX(gate.lane, perspective)
        gate.setPosition(projectedX, this.gateY).setScale(scale).setAlpha(.62 + progress * .38)
      })
      if (this.gateY >= CHECK_Y && !this.hasCheckedCurrentGate) {
        this.hasCheckedCurrentGate = true
        const selected = this.gates.find((gate) => gate.lane === this.currentLane)
        if (selected) this.resolveGate(selected.answer)
      }
    }
  }

  private createQuestionPanel() {
    const shadow = this.add.rectangle(0, 9, 570, 224, 0x8d5700, .26).setStrokeStyle(10, 0xffffff, .35)
    const outer = this.add.rectangle(0, 0, 570, 224, 0xffa900, 1).setStrokeStyle(5, 0xfff06a)
    const panel = this.add.rectangle(0, 0, 548, 202, 0xfffbef, .98).setStrokeStyle(3, 0xd98a08)
    this.questionPanel = this.add.container(GAME_WIDTH / 2, 255, [shadow, outer, panel]).setDepth(20)
    this.questionText = this.add.container(GAME_WIDTH / 2, 255).setDepth(21)
  }

  private createCar() {
    const shadow = this.add.ellipse(0, 93, 194, 38, 0x000000, .28)
    const cappyCar = this.add.image(0, 0, 'racing-cappy-car').setDisplaySize(224, 224)
    this.car = this.add.container(carLaneX(this.currentLane), CAR_Y, [shadow, cappyCar]).setDepth(30)
  }

  private createControls() {
    const makeButton = (x: number, label: string, direction: -1 | 1) => {
      // At the common 535px-wide mobile viewport these game-space dimensions
      // render at roughly 64x52px, with an invisible 76x64px touch target.
      const buttonY = 1158
      const visualWidth = 86
      const visualHeight = 70
      const hitWidth = 102
      const hitHeight = 86
      const normalAlpha = .32
      const pressedAlpha = .85

      const shadow = this.add.graphics()
        .fillStyle(0x07131d, .16)
        .fillRoundedRect(-visualWidth / 2, -visualHeight / 2 + 4, visualWidth, visualHeight, 18)
      const surface = this.add.graphics()
        .fillStyle(0x263844, .92)
        .fillRoundedRect(-visualWidth / 2, -visualHeight / 2, visualWidth, visualHeight, 18)
        .lineStyle(2, 0xf3f7fa, .72)
        .strokeRoundedRect(-visualWidth / 2, -visualHeight / 2, visualWidth, visualHeight, 18)
      const arrow = this.add.text(0, -2, label, {
        fontFamily: 'Arial', fontSize: '48px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(.5).setAlpha(.65)
      const hitArea = this.add.zone(0, 0, hitWidth, hitHeight).setInteractive({ useHandCursor: true })
      const button = this.add.container(x, buttonY, [shadow, surface, arrow, hitArea]).setDepth(35).setAlpha(normalAlpha)
      const baseScaleX = button.scaleX
      const baseScaleY = button.scaleY

      const tweenButton = (pressed: boolean) => {
        this.tweens.killTweensOf(button)
        this.tweens.add({
          targets: button,
          scaleX: pressed ? baseScaleX * .92 : baseScaleX,
          scaleY: pressed ? baseScaleY * .92 : baseScaleY,
          alpha: pressed ? pressedAlpha : normalAlpha,
          duration: pressed ? 80 : 100,
          ease: 'Sine.Out',
        })
      }

      hitArea.on('pointerdown', () => {
        tweenButton(true)
        this.changeLane(direction)
      })
      hitArea.on('pointerup', () => tweenButton(false))
      hitArea.on('pointerout', () => tweenButton(false))
      hitArea.on('pointerupoutside', () => tweenButton(false))
      return button
    }
    makeButton(58, '←', -1)
    makeButton(GAME_WIDTH - 58, '→', 1)
    const hintBg = this.add.rectangle(0, 0, 200, 62, 0xfffbeb, .88).setStrokeStyle(3, 0xe7a928)
    const hintText = this.add.text(0, 0, '☝  ↔', { fontSize: '38px', color: '#58606b' }).setOrigin(.5)
    this.hint = this.add.container(GAME_WIDTH / 2, 1160, [hintBg, hintText]).setDepth(34)
  }

  private renderQuestion(animate = true) {
    const question = this.questions[this.questionIndex]
    const expectedAnswer = this.getExpectedAnswer(question)
    this.tracker?.startQuestion({ learningKey: getRecognizeNumberKey(expectedAnswer), expectedAnswer })
    const content = question.type === 'count'
      ? (question.quantity === 0 ? '0' : this.arrangeObjects(question.object, question.quantity))
      : question.type === 'numberToQuantity'
        ? String(question.number)
        : question.sequence.map((value) => value ?? '?').join('   ')
    this.tweens.killTweensOf(this.questionText)
    if (animate) {
      this.tweens.add({
        targets: this.questionText,
        x: GAME_WIDTH / 2 - 90,
        alpha: 0,
        duration: 350,
        ease: 'Cubic.In',
        onComplete: () => {
          this.renderBubbleStyleQuestion(content)
          this.questionText.setPosition(GAME_WIDTH / 2 + 90, 255).setAlpha(0).setScale(.9)
          this.tweens.add({
            targets: this.questionText,
            x: GAME_WIDTH / 2,
            alpha: 1,
            scale: 1,
            duration: 480,
            ease: 'Back.Out',
          })
        },
      })
    } else {
      this.renderBubbleStyleQuestion(content)
      this.questionText.setPosition(GAME_WIDTH / 2, 255).setAlpha(1).setScale(1)
    }
    this.questionStartedAt = this.time.now
  }

  private renderBubbleStyleQuestion(content: string) {
    this.questionText.removeAll(true)
    const tokens = content.split(/\s+/).filter(Boolean)
    const palette = Phaser.Utils.Array.Shuffle(['#2563eb', '#22c55e', '#a855f7', '#f59e0b', '#0891b2'])
    const gap = 14
    const labels = tokens.map((token, index) => {
      const label = this.add.text(0, 0, token, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '58px',
        fontStyle: 'bold',
        color: token === '?' ? '#ef2f36' : palette[index % palette.length],
        stroke: '#ffffff',
        strokeThickness: 4,
      }).setOrigin(.5)
      label.setShadow(0, 3, 'rgba(49, 46, 129, 0.22)', 3)
      return label
    })
    const totalWidth = labels.reduce((width, label) => width + label.width, 0) + gap * Math.max(0, labels.length - 1)
    let cursor = -totalWidth / 2
    labels.forEach((label) => {
      label.setX(cursor + label.width / 2)
      cursor += label.width + gap
      this.questionText.add(label)
    })
  }

  private arrangeObjects(object: string, quantity: number) {
    if (quantity < 4) return Array.from({ length: quantity }, () => object).join('  ')
    const firstRow = Math.ceil(quantity / 2)
    return `${Array.from({ length: firstRow }, () => object).join('  ')}\n${Array.from({ length: quantity - firstRow }, () => object).join('  ')}`
  }

  private spawnGates() {
    if (this.state === RacingState.FINISHED) return
    this.clearGates()
    this.state = RacingState.RUNNING
    this.hasCheckedCurrentGate = false
    this.gateY = HORIZON_Y
    const question = this.questions[this.questionIndex]
    const answers = shuffle(question.type === 'numberToQuantity' ? question.quantities : question.options)
    const correctIndex = answers.indexOf(this.getExpectedAnswer(question))
    if (correctIndex === this.currentLane) {
      const availableLanes = [LANES.left, LANES.center, LANES.right].filter((lane) => lane !== this.currentLane)
      const targetLane = Phaser.Utils.Array.GetRandom(availableLanes)
      ;[answers[correctIndex], answers[targetLane]] = [answers[targetLane], answers[correctIndex]]
    }
    const colors = [0xee4438, 0xf3ba22, 0x1679d4]
    const obstacleTexture = Phaser.Math.RND.pick(['racing-answer-rock', 'racing-answer-barrel'])
    answers.forEach((answer, index) => {
      const lane = index as Lane
      const obstacle = this.add.image(0, 0, obstacleTexture).setDisplaySize(140, 140)
      const plaque = this.add.graphics()
      plaque.fillStyle(0xfff7df, .96).fillCircle(0, 7, 43)
        .lineStyle(6, colors[index], 1).strokeCircle(0, 7, 43)
        .lineStyle(2, 0x54361f, .75).strokeCircle(0, 7, 36)
      const label = question.type === 'numberToQuantity'
        ? this.createQuantityLabel(question.object, answer)
        : this.add.text(0, 7, String(answer), { fontFamily: 'Arial Rounded MT Bold, Arial', fontSize: '58px', fontStyle: 'bold', color: '#fffaf0', stroke: '#3d291d', strokeThickness: 8 }).setOrigin(.5)
      const gate = this.add.container(this.projectGateX(lane, 0), this.gateY, [obstacle, plaque, label]).setDepth(16).setScale(.18).setAlpha(.62) as AnswerGate
      gate.answer = answer
      gate.lane = lane
      this.gates.push(gate)
    })
    this.scheduleWolfForCurrentRound()
  }

  private resolveGate(selectedAnswer: number) {
    this.clearWolfEvent()
    const question = this.questions[this.questionIndex]
    const isCorrect = selectedAnswer === this.getExpectedAnswer(question)
    this.trackAnswer(selectedAnswer, isCorrect)
    if (isCorrect) this.handleCorrect()
    else this.handleWrong()
  }

  private projectGateX(lane: Lane, progress: number) {
    if (lane === LANES.center) return GAME_WIDTH / 2
    const offset = Phaser.Math.Interpolation.Bezier([...ANSWER_PATH_OFFSETS], progress)
    return GAME_WIDTH / 2 + (lane === LANES.left ? -offset : offset)
  }

  private getExpectedAnswer(question: RacingQuestion) {
    if (question.type === 'count') return question.quantity
    if (question.type === 'numberToQuantity') return question.number
    return question.answer
  }

  private createQuantityLabel(object: string, quantity: number) {
    const container = this.add.container(0, 7)
    if (quantity <= 0) {
      container.add(this.add.text(0, 0, '0', {
        fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#3d291d',
      }).setOrigin(.5))
      return container
    }

    // Fit 1–5 individual icons inside the plaque's 72x72px safe content area.
    const columns = Math.min(3, quantity)
    const rows = Math.ceil(quantity / columns)
    const cellWidth = 62 / columns
    const cellHeight = 58 / rows
    const fontSize = Phaser.Math.Clamp(Math.floor(Math.min(cellWidth, cellHeight) * .92), 14, 27)
    for (let index = 0; index < quantity; index += 1) {
      const row = Math.floor(index / columns)
      const itemsInRow = Math.min(columns, quantity - row * columns)
      const column = index % columns
      const x = (column - (itemsInRow - 1) / 2) * cellWidth
      const y = (row - (rows - 1) / 2) * cellHeight
      container.add(this.add.text(x, y, object, { fontSize: `${fontSize}px` }).setOrigin(.5))
    }
    return container
  }

  private scheduleWolfForCurrentRound() {
    // Test configuration: trigger exactly once in every one of the 10 rounds.
    if (this.wolfTriggeredRounds.has(this.questionIndex) || this.wolfEventActive) return
    this.wolfTriggeredRounds.add(this.questionIndex)
    let timer!: Phaser.Time.TimerEvent
    timer = this.time.delayedCall(300, () => {
      this.wolfTimers.delete(timer)
      if (!this.gameStarted || this.paused || this.state !== RacingState.RUNNING) return
      this.startWolfLaneInvasion()
    })
    this.wolfTimers.add(timer)
  }

  private startWolfLaneInvasion() {
    if (this.wolfEventActive || this.state !== RacingState.RUNNING) return
    this.wolfEventActive = true
    this.wolfEventPhase = 'ENTERING'
    const side: -1 | 1 = Phaser.Math.RND.pick([-1, 1] as const)
    const startX = side < 0 ? -150 : GAME_WIDTH + 150
    const peekX = side < 0 ? 18 : GAME_WIDTH - 18
    this.wolf = this.add.sprite(startX, CAR_Y, 'racing-wolf-states', 0)
      // The wolf occupies more vertical space inside each frame than Cappy;
      // 290px makes their complete visible silhouettes roughly equal in size.
      .setDisplaySize(290, 290)
      .setFlipX(side < 0)
      .setScale(.9)
      .setDepth(31)
    this.tweens.add({
      targets: this.wolf, x: peekX, y: CAR_Y, scale: 1,
      duration: 480, ease: 'Cubic.Out', onComplete: () => this.wolfApproach(side),
    })
  }

  private wolfApproach(side: -1 | 1) {
    if (!this.wolf?.active || !this.wolfEventActive) return
    this.wolfEventPhase = 'APPROACHING'
    this.wolf.setFrame(1)
    const approachX = Phaser.Math.Clamp(this.car.x + side * 215, 92, GAME_WIDTH - 92)
    this.tweens.add({
      targets: this.wolf, x: approachX, y: CAR_Y, scale: 1,
      duration: 420, ease: 'Sine.InOut', onComplete: () => this.wolfPush(side),
    })
  }

  private wolfPush(side: -1 | 1) {
    if (!this.wolf?.active || !this.wolfEventActive) return
    this.wolfEventPhase = 'PUSHING'
    this.wolf.setFrame(2)
    this.wolfImpactActive = true
    const contactX = Phaser.Math.Clamp(this.car.x + side * 185, 94, GAME_WIDTH - 94)
    this.tweens.add({
      targets: this.wolf, x: contactX, angle: -side * 3,
      duration: 290, ease: 'Cubic.In', onComplete: () => {
        if (!this.wolf?.active || !this.wolfEventActive) return
        this.wolf.setFrame(3)
        this.cameras.main.shake(100, .002)
        const previousLane = this.currentLane
        const pushedLane = Phaser.Math.Clamp(previousLane - side, LANES.left, LANES.right) as Lane
        this.currentLane = pushedLane
        const stayedAtBoundary = pushedLane === previousLane
        this.tweens.add({
          targets: this.car,
          x: stayedAtBoundary ? carLaneX(pushedLane) - side * 12 : carLaneX(pushedLane),
          angle: -side * 2.5,
          duration: stayedAtBoundary ? 100 : 300,
          yoyo: stayedAtBoundary,
          ease: 'Sine.InOut',
          onComplete: () => {
            this.car.setX(carLaneX(this.currentLane))
            this.car.setAngle(0)
            this.wolfImpactActive = false
          },
        })
        this.wolfLaugh(side)
      },
    })
  }

  private wolfLaugh(side: -1 | 1) {
    if (!this.wolf?.active || !this.wolfEventActive) return
    this.wolfEventPhase = 'LAUGHING'
    this.wolf.setFrame(4)
    if (!this.sound.mute) this.wolfLaughSound?.play()
    this.tweens.add({
      targets: this.wolf, scaleX: 1.035, scaleY: .97, angle: side * 2,
      duration: 170, yoyo: true, repeat: 1, ease: 'Sine.InOut',
      onComplete: () => this.wolfEscape(side),
    })
  }

  private wolfEscape(side: -1 | 1) {
    if (!this.wolf?.active || !this.wolfEventActive) return
    this.wolfEventPhase = 'ESCAPING'
    this.wolf.setFrame(5).setAngle(0)
    this.tweens.add({
      targets: this.wolf,
      x: GAME_WIDTH / 2 + side * 82,
      y: HORIZON_Y + 55,
      scale: .25,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.In',
      onComplete: () => this.clearWolfEvent(),
    })
  }

  private clearWolfEvent() {
    this.wolfTimers.forEach((timer) => timer.remove(false))
    this.wolfTimers.clear()
    if (this.wolfLaughSound?.isPlaying) this.wolfLaughSound.stop()
    if (this.wolf?.active) {
      this.tweens.killTweensOf(this.wolf)
      this.wolf.destroy()
    }
    this.wolf = undefined
    if (this.wolfImpactActive && this.car?.active) {
      this.tweens.killTweensOf(this.car)
      this.car.setPosition(carLaneX(this.currentLane), CAR_Y).setAngle(0)
    }
    this.wolfImpactActive = false
    this.wolfEventActive = false
    this.wolfEventPhase = 'IDLE'
  }

  private handleCorrect() {
    this.state = RacingState.RESOLVING_CORRECT
    this.correctSfx?.play()
    if (this.questionIndex !== this.questions.length - 1) {
      this.playRandomVoice(['voice-true-1', 'voice-true-2', 'voice-true-3', 'voice-true-4', 'voice-true-5'], 'true')
    }
    this.score += 10
    this.currentSpeed = BOOST_SPEED
    this.game.events.emit('game-ui:score', this.score)
    this.floatScore('+10', '#fff176')
    this.sparkles(this.car.x, this.car.y - 80, 14)
    this.gates.forEach((gate) => this.tweens.add({ targets: gate, y: GAME_HEIGHT + 130, alpha: 0, duration: 430, onComplete: () => gate.destroy() }))
    this.gates = []
    if (this.questionIndex === this.questions.length - 1) {
      this.time.delayedCall(850, () => this.startFinishSequence())
      return
    }
    this.questionIndex += 1
    this.attemptCount = 1
    this.game.events.emit('game-ui:round', this.questionIndex + 1)
    this.time.delayedCall(500, () => this.renderQuestion())
    this.time.delayedCall(900, () => { this.currentSpeed = NORMAL_SPEED; this.spawnGates() })
  }

  private handleWrong() {
    this.state = RacingState.RESOLVING_WRONG
    this.wrongSfx?.play()
    this.playRandomVoice(['voice-false-1', 'voice-false-2', 'voice-false-3', 'voice-false-4', 'voice-false-5'], 'false')
    this.score = Math.max(0, this.score - 2)
    this.attemptCount += 1
    this.currentSpeed = HIT_SPEED
    this.game.events.emit('game-ui:score', this.score)
    this.floatScore('-2', '#ff8b82')
    this.cameras.main.shake(220, .006)
    const impact = this.add.text(this.car.x, this.car.y - 105, '💥', { fontSize: '88px' }).setOrigin(.5).setDepth(50)
    this.tweens.killTweensOf(this.car)
    this.tweens.add({ targets: this.car, y: CAR_Y + 50, angle: -5, duration: 170, yoyo: true, repeat: 1, onComplete: () => {
      this.car.setAngle(0).setY(CAR_Y)
      this.tweens.add({ targets: this.car, y: CAR_Y + 4, duration: 160, yoyo: true, repeat: -1 })
    } })
    this.tweens.add({ targets: impact, scale: 1.45, alpha: 0, duration: 480, onComplete: () => impact.destroy() })
    this.gates.forEach((gate) => this.tweens.add({ targets: gate, alpha: 0, y: GAME_HEIGHT + 100, duration: 400, onComplete: () => gate.destroy() }))
    this.gates = []
    this.time.delayedCall(650, () => { this.currentSpeed = NORMAL_SPEED })
    this.time.delayedCall(850, () => this.spawnGates())
  }

  private startFinishSequence() {
    this.clearWolfEvent()
    this.state = RacingState.FINISHED
    this.currentSpeed = BOOST_SPEED
    this.questionPanel.setVisible(false)
    this.questionText.setVisible(false)
    this.tweens.killTweensOf(this.car)

    const runToFinish = () => {
      this.currentLane = LANES.center
      this.car.setAngle(0)
      const finish = this.add.container(GAME_WIDTH / 2, HORIZON_Y).setDepth(40).setScale(.3)
      const banner = this.add.rectangle(0, 0, 500, 90, 0xffffff).setStrokeStyle(8, 0x222222)
      const text = this.add.text(0, 0, '🏁  FINISH  🏁', { fontFamily: 'Arial', fontSize: '46px', fontStyle: 'bold', color: '#202020' }).setOrigin(.5)
      finish.add([banner, text])

      // Once centered, Cappy drives straight toward the horizon.
      this.tweens.add({ targets: this.car, y: 680, scale: .7, duration: 1150, ease: 'Sine.In' })
      this.tweens.add({ targets: finish, y: 855, scale: 1, duration: 1500, ease: 'Sine.In', onComplete: () => {
        this.sparkles(GAME_WIDTH / 2, 650, 32)
        this.voiceManager?.playOnce('win', 'voice-win', 'win')
        this.time.delayedCall(1200, () => {
          const trackingTask = this.tracker?.finishSession(this.score)
          this.game.events.emit('game-ui:complete', this.score, trackingTask)
        })
      } })
    }

    if (this.currentLane === LANES.center) {
      runToFinish()
      return
    }

    const turnDirection = this.currentLane === LANES.left ? 1 : -1
    this.tweens.add({
      targets: this.car,
      x: carLaneX(LANES.center),
      angle: turnDirection * 4,
      duration: 420,
      ease: 'Sine.InOut',
      onComplete: runToFinish,
    })
  }

  private changeLane(direction: -1 | 1) {
    if (!this.gameStarted || this.paused || this.wolfImpactActive || this.state !== RacingState.RUNNING) return
    const next = Phaser.Math.Clamp(this.currentLane + direction, LANES.left, LANES.right) as Lane
    if (next === this.currentLane) return
    this.currentLane = next
    if (!this.sound.mute) this.laneWhoosh?.play()
    this.tweens.add({ targets: this.car, x: carLaneX(next), angle: direction * 4, duration: 190, ease: 'Sine.InOut', onComplete: () => this.tweens.add({ targets: this.car, angle: 0, duration: 80 }) })
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) { if (this.gameStarted) this.pointerStartX = pointer.x }
  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.pointerStartX === undefined) return
    const distance = pointer.x - this.pointerStartX
    this.pointerStartX = undefined
    if (Math.abs(distance) >= 42) this.changeLane(distance < 0 ? -1 : 1)
  }
  private onLeftKey() { this.changeLane(-1) }
  private onRightKey() { this.changeLane(1) }

  private floatScore(value: string, color: string) {
    const text = this.add.text(this.car.x, this.car.y - 120, value, { fontFamily: 'Arial', fontSize: '52px', fontStyle: 'bold', color, stroke: '#24364b', strokeThickness: 7 }).setOrigin(.5).setDepth(60)
    this.tweens.add({ targets: text, y: text.y - 80, alpha: 0, duration: 650, onComplete: () => text.destroy() })
  }

  private sparkles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i += 1) {
      const particle = this.add.circle(x, y, Phaser.Math.Between(4, 9), Phaser.Utils.Array.GetRandom([0xffd740, 0x42e5f5, 0xff5c8a, 0x7ee55c])).setDepth(55)
      const angle = i / count * Math.PI * 2
      const distance = Phaser.Math.Between(80, 230)
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, duration: 650, onComplete: () => particle.destroy() })
    }
  }

  private trackAnswer(selectedAnswer: number, isCorrect: boolean) {
    const question = this.questions[this.questionIndex]
    const expectedAnswer = this.getExpectedAnswer(question)
    this.tracker?.recordAnswer({
      learningKey: getRecognizeNumberKey(expectedAnswer), expectedAnswer,
      selectedAnswer, correct: isCorrect,
    })
    const event: RacingTrackingEvent = {
      game: 'racing', lesson: LESSON_IDS.TOAN_1_BAI_1, questionIndex: this.questionIndex,
      skill: question.skill, target: expectedAnswer, selectedAnswer, correctAnswer: expectedAnswer,
      isCorrect, attempt: this.attemptCount, responseTime: Math.round(this.time.now - this.questionStartedAt),
    }
    if (process.env.NODE_ENV === 'development') console.info('[racing:answer]', event)
    this.game.events.emit('racing:answer', event)
  }

  private clearGates() { this.gates.forEach((gate) => gate.destroy()); this.gates = [] }
  private startMusic() {
    if (this.sound.mute) return
    if (!this.music?.isPlaying) this.music?.play()
    if (!this.engineSound?.isPlaying) this.engineSound?.play()
  }
  private setupVoice() {
    this.voiceManager = new GameVoiceManager(this.sound, [
      { key: 'racing-voice-intro' },
      { key: 'voice-true-1' }, { key: 'voice-true-2' }, { key: 'voice-true-3' },
      { key: 'voice-true-4' }, { key: 'voice-true-5' },
      { key: 'voice-false-1' }, { key: 'voice-false-2' }, { key: 'voice-false-3' },
      { key: 'voice-false-4' }, { key: 'voice-false-5' },
      { key: 'voice-win', volume: .9 },
    ])
  }
  private playRandomVoice(keys: string[], priority: VoicePriority) {
    this.voiceManager?.play(Phaser.Utils.Array.GetRandom(keys), priority)
  }
  private async loadAdaptiveQuestions(loadGeneration: number) {
    const randomQuestions = createRacingQuestions()
    const questions = await buildAdaptiveQuestions({
      lessonId: LESSON_IDS.TOAN_1_BAI_1,
      gameId: GAME_IDS.RACING,
      supportedTargets: RACING_SUPPORTED_TARGETS,
      totalRounds: randomQuestions.length,
      generateRandomQuestion: (index) => randomQuestions[index],
      generateQuestionForTarget: createRacingQuestionForTarget,
    })
    if (loadGeneration === this.adaptiveLoadGeneration) this.questions = questions
  }
  private startGameplay() {
    if (this.gameStarted) return
    this.gameStarted = true
    this.tracker = createGameTracker({ lessonId: LESSON_IDS.TOAN_1_BAI_1, gameId: GAME_IDS.RACING })
    this.game.registry.set('game-ui:started', true)
    this.startMusic()
    this.time.delayedCall(500, () => this.voiceManager?.playOnce('intro', 'racing-voice-intro', 'intro'))
    this.tweens.add({ targets: this.car, y: CAR_Y + 4, duration: 160, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    this.renderQuestion(false)
    this.time.delayedCall(700, () => this.spawnGates())
    this.time.delayedCall(2600, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 500 }))
  }
  private setMuted(value: boolean) { this.sound.mute = value; if (!value && this.gameStarted) this.startMusic() }
  private setPaused(value: boolean) { this.paused = value; value ? this.tweens.pauseAll() : this.tweens.resumeAll() }
  private restart() { this.gameStarted = false; this.paused = false; this.scene.restart() }
  private cleanup() {
    this.clearWolfEvent()
    this.adaptiveLoadGeneration += 1
    this.input.keyboard?.off('keydown-LEFT', this.onLeftKey, this)
    this.input.keyboard?.off('keydown-RIGHT', this.onRightKey, this)
    this.input.off('pointerdown', this.onPointerDown, this)
    this.input.off('pointerup', this.onPointerUp, this)
    this.game.events.off('game-ui:mute', this.setMuted, this)
    this.game.events.off('game-ui:pause', this.setPaused, this)
    this.game.events.off('game-ui:restart', this.restart, this)
    this.game.events.off('game-ui:start', this.startGameplay, this)
    this.music?.destroy()
    this.engineSound?.destroy()
    this.laneWhoosh?.destroy()
    this.correctSfx?.destroy()
    this.wrongSfx?.destroy()
    this.wolfLaughSound?.destroy()
    this.voiceManager?.destroy()
  }
}
