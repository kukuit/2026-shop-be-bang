import * as Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, HORIZON_Y } from '../constants'

export class RoadController {
  private markers: Phaser.GameObjects.Rectangle[] = []
  private scenery: Phaser.GameObjects.Ellipse[] = []

  constructor(private scene: Phaser.Scene) {}

  create() {
    this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'racing-valley-road')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(-10)

    // A few light streaks keep the road feeling alive while retaining the illustrated background.
    for (let i = 0; i < 8; i += 1) {
      const marker = this.scene.add.rectangle(i % 2 ? 450 : 270, HORIZON_Y + Math.floor(i / 2) * 190, 7, 58, 0xffffff, .28)
      this.markers.push(marker)
    }
  }

  update(delta: number, speed: number) {
    const movement = delta * .26 * speed
    this.markers.forEach((marker) => {
      marker.y += movement
      if (marker.y > GAME_HEIGHT + 50) marker.y = HORIZON_Y - 70
      const perspective = Phaser.Math.Clamp((marker.y - HORIZON_Y) / 700, .22, 1)
      marker.setScale(perspective)
    })
  }
}
