import * as Phaser from 'phaser'

export class Shooter extends Phaser.GameObjects.Container {
  private readonly barrel: Phaser.GameObjects.Image
  private readonly aimGuide: Phaser.GameObjects.Graphics
  private aimAngle: number
  private readonly pivotY: number
  readonly barrelLength: number

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const barrelLength = 75
    const pivotY = -33
    const aimGuide = scene.add.graphics()
    const barrel = scene.add.image(0, pivotY, 'cannon-barrel')
      .setOrigin(0.5, 0.9)
      .setDisplaySize(55, 85)
    const base = scene.add.image(0, 14, 'cannon-base')
      .setDisplaySize(188, 125)

    super(scene, x, y, [aimGuide, barrel, base])
    this.barrelLength = barrelLength
    this.pivotY = pivotY
    this.aimAngle = -Math.PI / 2
    this.barrel = barrel
    this.aimGuide = aimGuide
    scene.add.existing(this)
    this.setDepth(20)
    this.setAim(x, y - 100)
  }

  setAim(worldX: number, worldY: number) {
    const pivotWorldY = this.y + this.pivotY
    const raw = Math.atan2(worldY - pivotWorldY, worldX - this.x)
    this.aimAngle = Phaser.Math.Clamp(raw, Phaser.Math.DegToRad(-170), Phaser.Math.DegToRad(-10))
    this.barrel.rotation = this.aimAngle + Math.PI / 2
    this.drawAimGuide(worldX, worldY)
  }

  private drawAimGuide(worldX: number, worldY: number) {
    const pointerDistance = Phaser.Math.Distance.Between(
      this.x,
      this.y + this.pivotY,
      worldX,
      worldY,
    )
    const guideLength = Phaser.Math.Clamp(pointerDistance, 170, 390)
    this.aimGuide.clear()

    for (let distance = this.barrelLength + 18; distance <= guideLength; distance += 26) {
      const progress = distance / guideLength
      this.aimGuide.fillStyle(0xffffff, Phaser.Math.Linear(0.95, 0.45, progress))
      this.aimGuide.fillCircle(
        Math.cos(this.aimAngle) * distance,
        this.pivotY + Math.sin(this.aimAngle) * distance,
        Phaser.Math.Linear(6, 3.5, progress),
      )
    }
  }

  get shot() {
    return {
      angle: this.aimAngle,
      x: this.x + Math.cos(this.aimAngle) * this.barrelLength,
      y: this.y + this.pivotY + Math.sin(this.aimAngle) * this.barrelLength,
    }
  }
}
