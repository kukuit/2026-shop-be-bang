import type Phaser from 'phaser'

export function createVoiceButton(scene: Phaser.Scene, onPlay: () => void) {
  const background = scene.add.circle(0, 0, 50, 0xe0f2fe).setStrokeStyle(3, 0x38bdf8)
  const speaker = scene.add.text(0, 0, '🔊', { fontFamily: 'Arial, sans-serif', fontSize: '72px' }).setOrigin(0.5)
  speaker.setScale(Math.min(1, 78 / speaker.width, 78 / speaker.height))
  return scene.add.container(0, 0, [background, speaker]).setSize(106, 106)
    .setInteractive({ useHandCursor: true }).on('pointerdown', onPlay)
}
