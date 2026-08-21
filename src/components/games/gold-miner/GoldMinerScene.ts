import * as Phaser from 'phaser'
import { GAME_BACKGROUND_MUSIC } from '../general/audio'
import { GOLD_MINER_LEVELS, TASK_EMOJI } from './levels'
import { GoldMinerState, WolfState, type GoldMinerQuestion } from './types'

const W = 720
const H = 1280
const ANCHOR = new Phaser.Math.Vector2(300, 424)
const MIN_ANGLE = -65
const MAX_ANGLE = 65
const MAX_LENGTH = 720
const TASK_PANEL_CENTER = { x: 522, y: 270 }
const GOLD_SIZE_SCALES = [0.8, 0.9, 1, 1.1, 1.2]
const CLAW_GRIP_CENTER_Y = 68
const GOLD_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
  2: [{ x: 155, y: 735 }, { x: 545, y: 760 }],
  4: [{ x: 135, y: 680 }, { x: 550, y: 665 }, { x: 245, y: 910 }, { x: 540, y: 950 }],
  5: [{ x: 125, y: 660 }, { x: 360, y: 720 }, { x: 590, y: 650 }, { x: 205, y: 950 }, { x: 520, y: 980 }],
  6: [{ x: 105, y: 650 }, { x: 355, y: 700 }, { x: 610, y: 650 }, { x: 125, y: 930 }, { x: 365, y: 1015 }, { x: 600, y: 920 }],
  7: [{ x: 105, y: 625 }, { x: 355, y: 670 }, { x: 610, y: 625 }, { x: 175, y: 850 }, { x: 535, y: 850 }, { x: 125, y: 1060 }, { x: 575, y: 1060 }],
}

type MineItem = Phaser.GameObjects.Container & { value: number; radius: number; taken: boolean; rock: boolean }

export class GoldMinerScene extends Phaser.Scene {
  private state = GoldMinerState.ROUND_START
  private wolfState = WolfState.IDLE
  private question!: GoldMinerQuestion
  private round = 0
  private score = 0
  private angle = -50
  private direction = 1
  private ropeLength = 105
  private lockedAngle = 0
  private hookSpeed = 540
  private rope!: Phaser.GameObjects.Graphics
  private hook!: Phaser.GameObjects.Container
  private claw!: Phaser.GameObjects.Image
  private taskItems!: Phaser.GameObjects.Text
  private feedback!: Phaser.GameObjects.Text
  private cappyFace!: Phaser.GameObjects.Text
  private wolfCaughtIcons!: Phaser.GameObjects.Container
  private wolfCaught = 0
  private wolfRounds = new Set<number>()
  private mineItems: MineItem[] = []
  private grabbed?: MineItem
  private wolf?: Phaser.GameObjects.Container
  private wolfSprite?: Phaser.GameObjects.Sprite
  private wolfCarried?: MineItem
  private grabbedWolf = false
  private wolfSpawn?: Phaser.Time.TimerEvent
  private wolfAppeared = false
  private paused = false
  private music?: Phaser.Sound.BaseSound

  constructor() { super('GoldMinerScene') }

  preload() {
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      this.game.events.emit('gold-miner:progress', progress)
    })
    this.load.audio('gold-background', GAME_BACKGROUND_MUSIC)
    this.load.image('mine-background', '/games/gold-mining/images/mine-background.png')
    this.load.image('gold-nugget', '/games/gold-mining/images/gold.png')
    this.load.image('mine-rock', '/games/gold-mining/images/rock.png')
    this.load.image('golden-claw', '/games/gold-mining/images/golden-claw.png')
    this.load.image('golden-claw-closed', '/games/gold-mining/images/golden-claw-closed.png')
    this.load.spritesheet('wolf-animation', '/games/gold-mining/images/wolf-animation-alpha.png', {
      frameWidth: 512,
      frameHeight: 512,
    })
    this.load.spritesheet('wolf-rock-animation', '/games/gold-mining/images/wolf-rock-animation-alpha.png', {
      frameWidth: 512,
      frameHeight: 512,
    })
    this.load.image('wolf-caught-icon', '/games/gold-mining/images/wolf-caught-icon.png')
  }

  create() {
    this.drawMine()
    this.createTopScene()
    this.createHook()
    this.createWolfAnimations()
    this.feedback = this.add.text(W / 2, 525, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#fff7b2',
      stroke: '#5b2108', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(30)
    this.input.on('pointerdown', this.dropHook, this)
    this.game.events.on('game-ui:mute', this.setMuted, this)
    this.game.events.on('game-ui:pause', this.setPaused, this)
    this.game.events.on('game-ui:restart', this.restart, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
    this.music = this.sound.add('gold-background', { loop: true, volume: 0.22 })
    this.input.once('pointerdown', this.startMusic, this)
    if (this.wolfRounds.size === 0) this.prepareWolfRounds()
    this.game.events.emit('game-ui:score', this.score)
    this.startRound()
    this.game.events.emit('gold-miner:ready')
  }

  update(_: number, delta: number) {
    if (this.paused) return
    const seconds = Math.min(delta, 40) / 1000
    if (this.state === GoldMinerState.AIMING) {
      const speed = this.round < 2 ? 42 : this.round < 8 ? 49 : 55
      this.angle += this.direction * speed * seconds
      if (this.angle >= MAX_ANGLE || this.angle <= MIN_ANGLE) {
        this.angle = Phaser.Math.Clamp(this.angle, MIN_ANGLE, MAX_ANGLE)
        this.direction *= -1
      }
      this.positionHook(this.angle, this.ropeLength)
    } else if (this.state === GoldMinerState.HOOK_DOWN) {
      this.ropeLength += this.hookSpeed * seconds
      this.positionHook(this.lockedAngle, this.ropeLength)
      if (!this.detectHit() && this.ropeLength >= MAX_LENGTH) this.beginReturn()
    } else if (this.state === GoldMinerState.HOOK_UP) {
      this.ropeLength -= (this.grabbed ? 360 : 620) * seconds
      this.positionHook(this.lockedAngle, this.ropeLength)
      if (this.grabbed) this.positionItemInClaw(this.grabbed)
      if (this.grabbedWolf && this.wolf) this.wolf.setPosition(this.hook.x, this.hook.y + 38)
      if (this.ropeLength <= 108) this.finishReturn()
    }
    if (this.wolfCarried && this.wolf?.active) {
      this.wolfCarried.setPosition(this.wolf.x, this.wolf.y + 52).setScale(.72).setDepth(16)
    }
  }

  private drawMine() {
    this.add.image(W / 2, H / 2, 'mine-background').setDisplaySize(W, H).setDepth(-20)
  }

  private createTopScene() {
    this.cappyFace = this.add.text(235, 327, '', { fontSize: '1px' })
    this.taskItems = this.add.text(TASK_PANEL_CENTER.x, TASK_PANEL_CENTER.y, '', {
      fontSize: '46px',
      align: 'center',
      wordWrap: { width: 230 },
    }).setPadding(0, 8, 0, 0).setOrigin(.5)

    this.wolfCaughtIcons = this.add.container(451, 416).setDepth(25)
  }

  private createHook() {
    this.rope = this.add.graphics().setDepth(18)
    this.claw = this.add.image(0, 0, 'golden-claw')
      .setDisplaySize(88, 118)
      .setOrigin(.5, .1)
    this.hook = this.add.container(ANCHOR.x, ANCHOR.y + this.ropeLength, [this.claw]).setDepth(20)
  }

  private setClawClosed(closed: boolean) {
    this.claw.setTexture(closed ? 'golden-claw-closed' : 'golden-claw').setDisplaySize(88, 118)
  }

  private positionItemInClaw(item: MineItem) {
    const gripOffset = new Phaser.Math.Vector2(0, CLAW_GRIP_CENTER_Y).rotate(this.hook.rotation)
    item.setPosition(this.hook.x + gripOffset.x, this.hook.y + gripOffset.y)
  }

  private startRound() {
    this.clearRound()
    this.question = GOLD_MINER_LEVELS[this.round]
    this.state = GoldMinerState.ROUND_START
    this.wolfAppeared = false
    this.taskItems.setText(Array.from({ length: this.question.count }, () => TASK_EMOJI[this.question.objectType]).join(' '))
    this.game.events.emit('game-ui:round', this.round + 1)
    const positions = Phaser.Utils.Array.Shuffle([...(GOLD_LAYOUTS[this.question.choices.length] ?? GOLD_LAYOUTS[7])])
    this.question.choices.forEach((value, index) => {
      this.mineItems.push(this.createMineItem(positions[index].x, positions[index].y, value, index % 3 === 2))
    })
    this.feedback.setText('')
    this.time.delayedCall(650, () => {
      if (this.state !== GoldMinerState.ROUND_START) return
      this.feedback.setText('')
      this.state = GoldMinerState.AIMING
      this.scheduleWolf()
    })
  }

  private createMineItem(x: number, y: number, value: number, rock: boolean) {
    const sizeScale = rock ? 1 : Phaser.Utils.Array.GetRandom(GOLD_SIZE_SCALES)
    const sprite = this.add.image(0, 0, rock ? 'mine-rock' : 'gold-nugget')
      .setDisplaySize(145 * sizeScale, 106 * sizeScale)
    const label = this.add.text(0, 1, String(value), { fontFamily: 'Arial', fontSize: '55px', fontStyle: 'bold', color: '#ffffff', stroke: rock ? '#343434' : '#8a4300', strokeThickness: 9 }).setOrigin(.5)
    const item = this.add.container(x, y, [sprite, label]).setDepth(10) as MineItem
    item.value = value; item.radius = 62 * sizeScale; item.taken = false; item.rock = rock
    this.tweens.add({ targets: item, y: y - 7, duration: 1500 + x, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    return item
  }

  private positionHook(angle: number, length: number) {
    const rad = Phaser.Math.DegToRad(angle)
    const x = ANCHOR.x + Math.sin(rad) * length
    const y = ANCHOR.y + Math.cos(rad) * length
    this.hook.setPosition(x, y).setRotation(-rad)
    this.rope.clear()
      .lineStyle(12, 0x70451f, 1).lineBetween(ANCHOR.x, ANCHOR.y, x, y)
      .fillStyle(0x70451f, 1).fillCircle(ANCHOR.x, ANCHOR.y, 6).fillCircle(x, y, 6)
      .lineStyle(8, 0xd7ad67, 1).lineBetween(ANCHOR.x, ANCHOR.y, x, y)
      .fillStyle(0xd7ad67, 1).fillCircle(ANCHOR.x, ANCHOR.y, 4).fillCircle(x, y, 4)
  }

  private dropHook(pointer: Phaser.Input.Pointer) {
    if (this.paused || this.state !== GoldMinerState.AIMING || pointer.worldY < 90 || pointer.worldY > 1175) return
    this.setClawClosed(false)
    this.lockedAngle = this.angle
    this.state = GoldMinerState.HOOK_DOWN
    this.feedback.setText('')
  }

  private detectHit() {
    if (this.wolf && [WolfState.PEEK, WolfState.RUN_TO_GOLD, WolfState.STEAL].includes(this.wolfState)) {
      if (Phaser.Math.Distance.Between(this.hook.x, this.hook.y, this.wolf.x, this.wolf.y) < 67) {
        this.hitWolf(); return true
      }
    }
    const item = this.mineItems.find((candidate) => !candidate.taken && Phaser.Math.Distance.Between(this.hook.x, this.hook.y, candidate.x, candidate.y) < candidate.radius + 24)
    if (!item) return false
    item.taken = true
    this.grabbed = item
    this.setClawClosed(true)
    this.tweens.killTweensOf(item)
    this.state = GoldMinerState.GRABBING
    this.time.delayedCall(120, () => this.beginReturn())
    return true
  }

  private beginReturn() { if (this.state !== GoldMinerState.GRABBING) this.grabbed = undefined; this.state = GoldMinerState.HOOK_UP }

  private finishReturn() {
    this.ropeLength = 105
    this.positionHook(this.angle, this.ropeLength)
    this.setClawClosed(false)
    if (this.grabbedWolf) {
      this.grabbedWolf = false
      this.wolfCaught += 1
      const iconIndex = this.wolfCaught - 1
      const icon = this.add.image((iconIndex % 5) * 39, Math.floor(iconIndex / 5) * 36, 'wolf-caught-icon')
        .setDisplaySize(42, 42)
      const iconScale = icon.scaleX
      icon.setScale(iconScale * .05)
      this.wolfCaughtIcons.add(icon)
      this.tweens.add({ targets: icon, scaleX: iconScale, scaleY: iconScale, duration: 280, ease: 'Back.Out' })
      this.wolf?.destroy()
      this.wolf = undefined
      this.wolfState = WolfState.COOLDOWN
      this.feedback.setText('')
      this.state = GoldMinerState.AIMING
      return
    }
    if (!this.grabbed) { this.feedback.setText(''); this.state = GoldMinerState.AIMING; return }
    this.state = GoldMinerState.CHECK_ANSWER
    const item = this.grabbed
    this.grabbed = undefined
    if (item.value === this.question.correctAnswer) this.correct(item)
    else this.wrong(item)
  }

  private correct(item: MineItem) {
    this.state = GoldMinerState.ROUND_CLEAR
    this.cancelWolf()
    this.score += 10
    this.game.events.emit('game-ui:score', this.score)
    this.feedback.setColor('#fff59d').setText('⭐ +10')
    this.cappyFace.setText('★ᴗ★')
    this.sparkle(ANCHOR.x, ANCHOR.y + 40)
    item.destroy()
    this.time.delayedCall(850, () => {
      if (this.round === GOLD_MINER_LEVELS.length - 1) {
        this.state = GoldMinerState.GAME_COMPLETE
        this.game.events.emit('game-ui:complete', this.score)
      } else { this.round += 1; this.cappyFace.setText('•ᴗ•'); this.startRound() }
    })
  }

  private wrong(item: MineItem) {
    this.score = Math.max(0, this.score - 2)
    this.game.events.emit('game-ui:score', this.score)
    this.feedback.setColor('#ffb4a8').setText('-2')
    this.cappyFace.setText('•︵•')
    this.tweens.add({ targets: item, x: item.x + 15, duration: 60, yoyo: true, repeat: 3, onComplete: () => item.destroy() })
    this.time.delayedCall(650, () => {
      if (this.state !== GoldMinerState.CHECK_ANSWER) return
      this.feedback.setText('')
      this.cappyFace.setText('•ᴗ•')
      this.state = GoldMinerState.AIMING
    })
  }

  private scheduleWolf() {
    if (!this.wolfRounds.has(this.round) || this.wolfAppeared) return
    const scheduledRound = this.round
    this.wolfSpawn = this.time.delayedCall(450 + Math.random() * 450, () => this.attemptWolfSpawn(scheduledRound))
  }

  private prepareWolfRounds() {
    const eligibleRounds = Phaser.Utils.Array.Shuffle([2, 3, 4, 5, 6, 7, 8, 9])
    this.wolfRounds = new Set(eligibleRounds.slice(0, 4))
  }

  private attemptWolfSpawn(scheduledRound: number) {
    if (this.round !== scheduledRound || this.wolfAppeared || this.state === GoldMinerState.ROUND_CLEAR || this.state === GoldMinerState.GAME_COMPLETE) return
    if (this.state !== GoldMinerState.AIMING || this.grabbed) {
      this.wolfSpawn = this.time.delayedCall(350, () => this.attemptWolfSpawn(scheduledRound))
      return
    }
    this.spawnWolf()
  }

  private spawnWolf() {
    if (this.state !== GoldMinerState.AIMING || this.grabbed || this.wolfAppeared) return
    const targets = this.mineItems.filter((item) => item.active && !item.taken && item.value !== this.question.correctAnswer)
    if (!targets.length) return
    this.wolfAppeared = true
    this.wolfState = WolfState.PEEK
    const fromLeft = Math.random() < .5
    const startX = fromLeft ? -65 : W + 65
    const target = Phaser.Utils.Array.GetRandom(targets)
    this.wolfSprite = this.add.sprite(0, 0, 'wolf-animation', 0).setDisplaySize(210, 210)
    this.wolfSprite.setFlipX(fromLeft)
    this.wolfSprite.play('wolf-peek')
    this.wolf = this.add.container(startX, 1020, [this.wolfSprite]).setSize(150, 110).setDepth(17)
    this.feedback.setText('')
    this.tweens.add({ targets: this.wolf, x: fromLeft ? 45 : W - 45, duration: 400, onComplete: () => {
      if (!this.wolf?.active) return
      this.time.delayedCall(1500, () => this.runWolfLap(target, fromLeft))
    } })
  }

  private runWolfLap(target: MineItem, fromLeft: boolean) {
    if (!this.wolf?.active || this.wolfState !== WolfState.PEEK) return
    this.wolfState = WolfState.RUN_TO_GOLD
    const firstX = fromLeft ? W - 100 : 100
    const secondX = fromLeft ? 125 : W - 125
    this.playWolfRun(firstX)
    this.tweens.add({ targets: this.wolf, x: firstX, y: 790, duration: 1600, ease: 'Sine.InOut', onComplete: () => {
      if (!this.wolf?.active || this.wolfState !== WolfState.RUN_TO_GOLD) return
      this.playWolfRun(secondX)
      this.tweens.add({ targets: this.wolf, x: secondX, y: 1040, duration: 1400, ease: 'Sine.InOut', onComplete: () => {
        if (!this.wolf?.active || this.wolfState !== WolfState.RUN_TO_GOLD) return
        this.playWolfRun(target.x)
        this.tweens.add({ targets: this.wolf, x: target.x, y: target.y, duration: 1100, onComplete: () => this.stealGold(target, fromLeft) })
      } })
    } })
  }

  private stealGold(target: MineItem, fromLeft: boolean) {
    if (!this.wolf?.active || !target.active || target.taken || target.value === this.question.correctAnswer) {
      this.escapeWolf()
      return
    }
    this.wolfState = WolfState.STEAL
    target.taken = true
    this.tweens.killTweensOf(target)
    this.wolfCarried = target
    const exitX = fromLeft ? -120 : W + 120
    target.setVisible(false)
    this.wolfSprite?.setTexture(target.rock ? 'wolf-rock-animation' : 'wolf-animation')
      .setFlipX(exitX > this.wolf.x)
      .play(target.rock ? 'wolf-carry-rock' : 'wolf-carry')
    this.tweens.add({ targets: this.wolf, x: exitX, y: 1080, duration: 5400, ease: 'Sine.In', onComplete: () => {
      if (this.wolfState !== WolfState.STEAL) return
      this.wolfCarried?.destroy()
      this.wolfCarried = undefined
      this.wolf?.destroy()
      this.wolf = undefined
      this.wolfState = WolfState.COOLDOWN
    } })
  }

  private hitWolf() {
    this.state = GoldMinerState.GRABBING
    this.wolfState = WolfState.HIT
    this.feedback.setColor('#fff59d').setText('💫')
    if (this.wolf) this.tweens.killTweensOf(this.wolf)
    if (this.wolfCarried) {
      const dropped = this.wolfCarried
      this.wolfCarried = undefined
      dropped.taken = false
      dropped.setVisible(true).setScale(1).setDepth(10)
      dropped.setPosition(Phaser.Math.Clamp(this.wolf?.x ?? dropped.x, 90, W - 90), Phaser.Math.Clamp((this.wolf?.y ?? dropped.y) + 70, 610, 1080))
      this.tweens.add({ targets: dropped, y: dropped.y + 20, duration: 180, yoyo: true, ease: 'Bounce.Out' })
    }
    this.grabbedWolf = true
    this.setClawClosed(true)
    // Frame 3 là dáng chạy toàn thân. Giữ frame này khi bị móc kéo lên để
    // không vô tình hiển thị frame rình vốn chỉ có đầu và hai chân trước.
    this.wolfSprite?.stop().setFrame(3).setFlipY(false).setAngle(12)
    if (this.wolf) this.tweens.add({ targets: this.wolf, angle: 18, duration: 90, yoyo: true, repeat: 2 })
    this.time.delayedCall(300, () => this.beginReturn())
  }

  private escapeWolf() {
    if (!this.wolf?.active) return
    this.wolfState = WolfState.ESCAPE
    this.tweens.killTweensOf(this.wolf)
    this.playWolfRun(this.wolf.x < W / 2 ? -100 : W + 100)
    this.tweens.add({ targets: this.wolf, x: this.wolf.x < W / 2 ? -100 : W + 100, duration: 550, onComplete: () => { this.wolf?.destroy(); this.wolf = undefined; this.wolfState = WolfState.COOLDOWN } })
  }

  private sparkle(x: number, y: number) {
    for (let i = 0; i < 12; i += 1) {
      const star = this.add.text(x, y, '★', { fontSize: '28px', color: '#ffe23d' }).setOrigin(.5).setDepth(40)
      const rad = i / 12 * Math.PI * 2
      this.tweens.add({ targets: star, x: x + Math.cos(rad) * 125, y: y + Math.sin(rad) * 125, alpha: 0, duration: 550, onComplete: () => star.destroy() })
    }
  }

  private createWolfAnimations() {
    if (!this.anims.exists('wolf-peek')) this.anims.create({ key: 'wolf-peek', frames: this.anims.generateFrameNumbers('wolf-animation', { frames: [0, 1] }), frameRate: 2, repeat: -1, yoyo: true })
    if (!this.anims.exists('wolf-run')) this.anims.create({ key: 'wolf-run', frames: this.anims.generateFrameNumbers('wolf-animation', { frames: [2, 3] }), frameRate: 5, repeat: -1 })
    if (!this.anims.exists('wolf-carry')) this.anims.create({ key: 'wolf-carry', frames: this.anims.generateFrameNumbers('wolf-animation', { frames: [4, 5] }), frameRate: 2.5, repeat: -1 })
    if (!this.anims.exists('wolf-carry-rock')) this.anims.create({ key: 'wolf-carry-rock', frames: this.anims.generateFrameNumbers('wolf-rock-animation', { frames: [4, 5] }), frameRate: 2.5, repeat: -1 })
  }

  private playWolfRun(destinationX: number) {
    if (!this.wolf || !this.wolfSprite) return
    this.wolfSprite.setFlipX(destinationX > this.wolf.x).play('wolf-run', true)
  }

  private clearRound() {
    this.cancelWolf()
    this.mineItems.forEach((item) => item.destroy())
    this.mineItems = []
    this.grabbed = undefined
    this.ropeLength = 105
  }

  private cancelWolf() {
    this.wolfSpawn?.remove(false)
    this.wolfSpawn = undefined
    if (this.wolfCarried?.active) this.wolfCarried.destroy()
    this.wolfCarried = undefined
    this.grabbedWolf = false
    this.wolf?.destroy()
    this.wolf = undefined
    this.wolfSprite = undefined
    this.wolfState = WolfState.IDLE
  }
  private startMusic() { if (!this.sound.mute && !this.music?.isPlaying) this.music?.play() }
  private setMuted(value: boolean) { this.sound.mute = value; if (!value) this.startMusic() }
  private setPaused(value: boolean) { this.paused = value; value ? this.tweens.pauseAll() : this.tweens.resumeAll() }
  private restart() {
    this.cancelWolf()
    this.round = 0
    this.score = 0
    this.wolfCaught = 0
    this.wolfRounds.clear()
    this.state = GoldMinerState.ROUND_START
    this.wolfState = WolfState.IDLE
    this.wolfAppeared = false
    this.grabbed = undefined
    this.grabbedWolf = false
    this.ropeLength = 105
    this.angle = -50
    this.direction = 1
    this.paused = false
    this.game.events.emit('game-ui:score', 0)
    this.game.events.emit('game-ui:round', 1)
    this.scene.restart()
  }
  private cleanup() {
    this.cancelWolf()
    this.input.off('pointerdown', this.dropHook, this)
    this.input.off('pointerdown', this.startMusic, this)
    this.game.events.off('game-ui:mute', this.setMuted, this)
    this.game.events.off('game-ui:pause', this.setPaused, this)
    this.game.events.off('game-ui:restart', this.restart, this)
    this.music?.destroy()
  }
}
