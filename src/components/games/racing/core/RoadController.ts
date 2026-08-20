import * as Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, HORIZON_Y } from '../constants'

export class RoadController {
  private markers: Phaser.GameObjects.Rectangle[] = []
  private scenery: Phaser.GameObjects.Ellipse[] = []

  constructor(private scene: Phaser.Scene) {}

  create() {
    const graphics = this.scene.add.graphics()
    graphics.fillGradientStyle(0x27b8f3, 0x27b8f3, 0xbdefff, 0xbdefff).fillRect(0, 0, GAME_WIDTH, HORIZON_Y)
    graphics.fillStyle(0xffdc55).fillCircle(95, 165, 58)
    ;[[110, 260], [545, 185], [630, 350]].forEach(([x, y]) => {
      graphics.fillStyle(0xffffff, .82).fillEllipse(x, y, 135, 45).fillEllipse(x - 42, y + 5, 72, 42).fillEllipse(x + 42, y + 8, 84, 38)
    })
    graphics.fillStyle(0x75b84b).fillTriangle(0, 590, 180, 355, 330, 590).fillTriangle(240, 590, 470, 365, 720, 590)
    graphics.fillStyle(0x4f9e39).fillRect(0, 500, GAME_WIDTH, 175)
    graphics.fillStyle(0x343a40).fillRect(85, HORIZON_Y, 550, GAME_HEIGHT - HORIZON_Y)
    graphics.fillStyle(0xffffff).fillRect(80, HORIZON_Y, 10, GAME_HEIGHT - HORIZON_Y).fillRect(630, HORIZON_Y, 10, GAME_HEIGHT - HORIZON_Y)
    graphics.fillStyle(0xe94c35)
    for (let y = HORIZON_Y; y < GAME_HEIGHT; y += 60) graphics.fillRect(67, y, 18, 30).fillRect(635, y + 30, 18, 30)
    for (let i = 0; i < 12; i += 1) {
      const marker = this.scene.add.rectangle(i % 2 ? 445 : 275, HORIZON_Y + Math.floor(i / 2) * 145, 10, 75, 0xffffff, .9)
      this.markers.push(marker)
    }
    for (let i = 0; i < 8; i += 1) {
      const tree = this.scene.add.ellipse(i % 2 ? 675 : 45, 550 + i * 90, 55, 95, 0x238b35).setDepth(2)
      this.scenery.push(tree)
    }
    this.createBalloon(615, 270)
  }

  update(delta: number, speed: number) {
    const movement = delta * .26 * speed
    this.markers.forEach((marker) => {
      marker.y += movement
      if (marker.y > GAME_HEIGHT + 50) marker.y = HORIZON_Y - 70
      const perspective = Phaser.Math.Clamp((marker.y - HORIZON_Y) / 700, .22, 1)
      marker.setScale(perspective)
    })
    this.scenery.forEach((item) => {
      item.y += movement * .35
      if (item.y > GAME_HEIGHT + 60) item.y = 515
    })
  }

  private createBalloon(x: number, y: number) {
    const balloon = this.scene.add.container(x, y)
    const body = this.scene.add.ellipse(0, 0, 68, 90, 0xf05a3c).setStrokeStyle(5, 0xffffff)
    const stripe = this.scene.add.ellipse(0, 0, 20, 86, 0xffffff)
    const basket = this.scene.add.rectangle(0, 58, 25, 20, 0xb66b28)
    balloon.add([body, stripe, basket]).setDepth(1)
    this.scene.tweens.add({ targets: balloon, y: y + 12, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
  }
}
