import * as Phaser from 'phaser'

export class Shooter extends Phaser.GameObjects.Container {
  private readonly barrel: Phaser.GameObjects.Graphics
  private aimAngle: number
  readonly barrelLength: number

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const barrelLength = 92
    const base = scene.add.graphics()
    base.fillStyle(0xf97316).fillCircle(0, 0, 42)
    base.fillStyle(0xffedd5).fillCircle(0, 0, 24)
    base.lineStyle(6, 0xc2410c).strokeCircle(0, 0, 42)

    const barrel = scene.add.graphics()
    barrel.fillStyle(0x7c3aed).fillRoundedRect(0, -15, barrelLength, 30, 14)
    barrel.lineStyle(5, 0xffffff, 0.75).strokeRoundedRect(0, -15, barrelLength, 30, 14)

    super(scene, x, y, [barrel, base])
    this.barrelLength = barrelLength
    this.aimAngle = -Math.PI / 2
    this.barrel = barrel
    scene.add.existing(this)
    this.setDepth(20)
    this.setAim(x, y - 100)
  }

  setAim(worldX: number, worldY: number) {
    const raw = Math.atan2(worldY - this.y, worldX - this.x)
    this.aimAngle = Phaser.Math.Clamp(raw, Phaser.Math.DegToRad(-170), Phaser.Math.DegToRad(-10))
    this.barrel.rotation = this.aimAngle
  }

  get shot() {
    return {
      angle: this.aimAngle,
      x: this.x + Math.cos(this.aimAngle) * this.barrelLength,
      y: this.y + Math.sin(this.aimAngle) * this.barrelLength,
    }
  }
}
