import * as Phaser from 'phaser'
import { GAME_BACKGROUND_MUSIC } from '../general/audio'
import { BOOST_SPEED, CAR_Y, CHECK_Y, GAME_HEIGHT, GAME_WIDTH, HIT_SPEED, HORIZON_Y, LANES, NORMAL_SPEED, laneX } from './constants'
import { RoadController } from './core/RoadController'
import { createRacingQuestions } from './lessons/toan-1-bai-1'
import { RacingState, type Lane, type RacingQuestion, type RacingTrackingEvent } from './types'

type AnswerGate = Phaser.GameObjects.Container & { answer: number; lane: Lane }

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
  private questionText!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Container
  private paused = false
  private gameStarted = false
  private pointerStartX?: number
  private questionStartedAt = 0
  private music?: Phaser.Sound.BaseSound

  constructor() { super('RacingScene') }

  preload() {
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => this.game.events.emit('racing:progress', progress))
    this.load.audio('racing-background', GAME_BACKGROUND_MUSIC)
  }

  create() {
    this.questions = createRacingQuestions()
    this.road = new RoadController(this)
    this.road.create()
    this.createQuestionPanel()
    this.createCar()
    this.createControls()
    this.input.keyboard?.on('keydown-LEFT', () => this.changeLane(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.changeLane(1))
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.game.events.on('game-ui:mute', this.setMuted, this)
    this.game.events.on('game-ui:pause', this.setPaused, this)
    this.game.events.on('game-ui:restart', this.restart, this)
    this.game.events.on('game-ui:start', this.startGameplay, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
    this.music = this.sound.add('racing-background', { loop: true, volume: .16 })
    this.game.events.emit('game-ui:score', 0)
    this.game.events.emit('game-ui:round', 1)
    this.game.events.emit('racing:ready')
    if (this.game.registry.get('game-ui:started')) this.startGameplay()
  }

  update(_: number, delta: number) {
    if (!this.gameStarted || this.paused) return
    this.road.update(delta, this.currentSpeed)
    if (this.state === RacingState.RUNNING && this.gates.length) {
      this.gateY += delta * .105 * this.currentSpeed
      const progress = Phaser.Math.Clamp((this.gateY - HORIZON_Y) / (CHECK_Y - HORIZON_Y), 0, 1)
      const scale = Phaser.Math.Linear(.34, 1, progress)
      this.gates.forEach((gate) => gate.setPosition(laneX(gate.lane), this.gateY).setScale(scale).setAlpha(.55 + progress * .45))
      if (this.gateY >= CHECK_Y && !this.hasCheckedCurrentGate) {
        this.hasCheckedCurrentGate = true
        const selected = this.gates.find((gate) => gate.lane === this.currentLane)
        if (selected) this.resolveGate(selected.answer)
      }
    }
  }

  private createQuestionPanel() {
    const panel = this.add.rectangle(0, 0, 570, 260, 0xfffbeb, .97).setStrokeStyle(9, 0xffb51b)
    this.questionText = this.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '74px', fontStyle: 'bold', color: '#24364b', align: 'center',
      wordWrap: { width: 500 }, lineSpacing: 8,
    }).setOrigin(.5)
    this.questionPanel = this.add.container(GAME_WIDTH / 2, 275, [panel, this.questionText]).setDepth(20)
  }

  private createCar() {
    const shadow = this.add.ellipse(0, 76, 145, 38, 0x000000, .25)
    const body = this.add.graphics()
    body.fillStyle(0xe9362c).fillRoundedRect(-65, -72, 130, 145, 35)
      .lineStyle(7, 0x971a17).strokeRoundedRect(-65, -72, 130, 145, 35)
      .fillStyle(0x1889dd).fillRoundedRect(-43, -48, 86, 55, 18)
      .fillStyle(0xffffff).fillRect(-12, -72, 24, 145)
      .fillStyle(0x222222).fillCircle(-61, 48, 18).fillCircle(61, 48, 18)
      .fillStyle(0xffd33d).fillCircle(-42, 51, 10).fillCircle(42, 51, 10)
    const driver = this.add.circle(0, -57, 31, 0x176fc0).setStrokeStyle(7, 0xffffff)
    this.car = this.add.container(laneX(this.currentLane), CAR_Y, [shadow, body, driver]).setDepth(30)
  }

  private createControls() {
    const makeButton = (x: number, label: string, direction: -1 | 1) => {
      const circle = this.add.circle(x, 1160, 62, 0xffffff, .22).setStrokeStyle(5, 0xffffff, .62).setInteractive({ useHandCursor: true })
      const text = this.add.text(x, 1160, label, { fontFamily: 'Arial', fontSize: '62px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(.5)
      circle.on('pointerdown', () => this.changeLane(direction))
      return this.add.container(0, 0, [circle, text]).setDepth(35)
    }
    makeButton(100, '←', -1)
    makeButton(620, '→', 1)
    const hintBg = this.add.rectangle(0, 0, 230, 70, 0xfffbeb, .9).setStrokeStyle(3, 0xe7a928)
    const hintText = this.add.text(0, 0, '☝  ↔', { fontSize: '38px', color: '#58606b' }).setOrigin(.5)
    this.hint = this.add.container(GAME_WIDTH / 2, 1160, [hintBg, hintText]).setDepth(34)
  }

  private renderQuestion(animate = true) {
    const question = this.questions[this.questionIndex]
    const content = question.type === 'count'
      ? (question.quantity === 0 ? question.object : this.arrangeObjects(question.object, question.quantity))
      : question.type === 'numberToQuantity'
        ? String(question.number)
        : question.sequence.map((value) => value ?? '?').join('   ')
    const setContent = () => {
      this.questionText.setText(content)
      this.questionPanel.setAlpha(0)
      this.tweens.add({ targets: this.questionPanel, alpha: 1, duration: 200 })
    }
    if (animate) this.tweens.add({ targets: this.questionPanel, alpha: 0, duration: 150, onComplete: setContent })
    else { this.questionText.setText(content); this.questionPanel.setAlpha(1) }
    this.questionStartedAt = this.time.now
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
    const colors = [0xee4438, 0xf3ba22, 0x1679d4]
    answers.forEach((answer, index) => {
      const lane = index as Lane
      const frame = this.add.graphics()
      frame.fillStyle(colors[index]).fillRoundedRect(-70, -55, 140, 112, 22)
        .lineStyle(7, 0xffffff).strokeRoundedRect(-70, -55, 140, 112, 22)
        .fillStyle(0xfff8dc).fillRoundedRect(-54, -39, 108, 76, 16)
      const label = question.type === 'numberToQuantity'
        ? this.add.text(0, 0, this.arrangeObjects(question.object, answer), { fontSize: answer > 3 ? '22px' : '28px', align: 'center', lineSpacing: 0 }).setOrigin(.5)
        : this.add.text(0, 0, String(answer), { fontFamily: 'Arial', fontSize: '62px', fontStyle: 'bold', color: '#26384b' }).setOrigin(.5)
      const barrier = this.add.rectangle(0, 54, 135, 13, 0xffffff).setStrokeStyle(4, colors[index])
      const gate = this.add.container(laneX(lane), this.gateY, [frame, label, barrier]).setDepth(16).setScale(.34).setAlpha(.55) as AnswerGate
      gate.answer = answer
      gate.lane = lane
      this.gates.push(gate)
    })
  }

  private resolveGate(selectedAnswer: number) {
    const question = this.questions[this.questionIndex]
    const isCorrect = selectedAnswer === question.answer
    this.trackAnswer(selectedAnswer, isCorrect)
    if (isCorrect) this.handleCorrect()
    else this.handleWrong()
  }

  private handleCorrect() {
    this.state = RacingState.RESOLVING_CORRECT
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
    this.state = RacingState.FINISHED
    this.currentSpeed = BOOST_SPEED
    this.questionPanel.setVisible(false)
    const finish = this.add.container(GAME_WIDTH / 2, HORIZON_Y).setDepth(25).setScale(.3)
    const banner = this.add.rectangle(0, 0, 500, 90, 0xffffff).setStrokeStyle(8, 0x222222)
    const text = this.add.text(0, 0, '🏁  FINISH  🏁', { fontFamily: 'Arial', fontSize: '46px', fontStyle: 'bold', color: '#202020' }).setOrigin(.5)
    finish.add([banner, text])
    this.tweens.add({ targets: finish, y: 855, scale: 1, duration: 1500, ease: 'Sine.In', onComplete: () => {
      this.sparkles(GAME_WIDTH / 2, 650, 32)
      this.tweens.add({ targets: this.car, y: 680, scale: .7, duration: 650, ease: 'Sine.In' })
      this.time.delayedCall(1200, () => this.game.events.emit('game-ui:complete', this.score))
    } })
  }

  private changeLane(direction: -1 | 1) {
    if (!this.gameStarted || this.paused || this.state !== RacingState.RUNNING) return
    const next = Phaser.Math.Clamp(this.currentLane + direction, LANES.left, LANES.right) as Lane
    if (next === this.currentLane) return
    this.currentLane = next
    this.tweens.add({ targets: this.car, x: laneX(next), angle: direction * 4, duration: 190, ease: 'Sine.InOut', onComplete: () => this.tweens.add({ targets: this.car, angle: 0, duration: 80 }) })
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) { if (this.gameStarted) this.pointerStartX = pointer.x }
  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.pointerStartX === undefined) return
    const distance = pointer.x - this.pointerStartX
    this.pointerStartX = undefined
    if (Math.abs(distance) >= 42) this.changeLane(distance < 0 ? -1 : 1)
  }

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
    const event: RacingTrackingEvent = {
      game: 'racing', lesson: 'toan-1-bai-1-so-0-5', questionIndex: this.questionIndex,
      skill: question.skill, target: question.answer, selectedAnswer, correctAnswer: question.answer,
      isCorrect, attempt: this.attemptCount, responseTime: Math.round(this.time.now - this.questionStartedAt),
    }
    console.info('[racing:answer]', event)
    this.game.events.emit('racing:answer', event)
  }

  private clearGates() { this.gates.forEach((gate) => gate.destroy()); this.gates = [] }
  private startMusic() { if (!this.sound.mute && !this.music?.isPlaying) this.music?.play() }
  private startGameplay() {
    if (this.gameStarted) return
    this.gameStarted = true
    this.game.registry.set('game-ui:started', true)
    this.startMusic()
    this.tweens.add({ targets: this.car, y: CAR_Y + 4, duration: 160, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    this.renderQuestion(false)
    this.time.delayedCall(700, () => this.spawnGates())
    this.time.delayedCall(2600, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 500 }))
  }
  private setMuted(value: boolean) { this.sound.mute = value; if (!value && this.gameStarted) this.startMusic() }
  private setPaused(value: boolean) { this.paused = value; value ? this.tweens.pauseAll() : this.tweens.resumeAll() }
  private restart() { this.gameStarted = false; this.paused = false; this.scene.restart() }
  private cleanup() {
    this.input.off('pointerdown', this.onPointerDown, this)
    this.input.off('pointerup', this.onPointerUp, this)
    this.game.events.off('game-ui:mute', this.setMuted, this)
    this.game.events.off('game-ui:pause', this.setPaused, this)
    this.game.events.off('game-ui:restart', this.restart, this)
    this.game.events.off('game-ui:start', this.startGameplay, this)
    this.music?.destroy()
  }
}
