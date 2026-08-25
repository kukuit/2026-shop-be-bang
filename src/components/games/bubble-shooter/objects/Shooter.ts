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
    // Ổ tối nằm sau barrel, chỉ lộ trong khoảng trống của miệng nối.
    const socketBack = scene.add.graphics()
    socketBack.fillStyle(0x073b86, 1)
    socketBack.fillEllipse(0, pivotY, 58, 16)

    const barrel = scene.add.image(0, pivotY, 'cannon-barrel')
      // Hạ artwork thêm 5px quanh cùng pivot, để 30px chân barrel nằm sâu sau
      // vành trước và không còn hở khi nghiêng trái/phải.
      .setOrigin(0.5, 0.7)
      .setDisplaySize(55, 100)

    // Base được vẽ sau barrel để artwork vành vàng gốc trở thành lớp che khớp
    // phía trước. Không còn nét Graphics thủ công nằm trên bề mặt pháo.
    const base = scene.add.image(0, 14, 'cannon-base')
      .setDisplaySize(188, 125)

    super(scene, x, y, [aimGuide, socketBack, barrel, base])
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
    const barrelRotation = Phaser.Math.Clamp(
      raw + Math.PI / 2,
      Phaser.Math.DegToRad(-55),
      Phaser.Math.DegToRad(55),
    )
    this.aimAngle = barrelRotation - Math.PI / 2
    this.barrel.rotation = barrelRotation
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
