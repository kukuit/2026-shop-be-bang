import type Phaser from 'phaser'

const VOICE_ICON_KEY = 'general-voice-icon'
const voiceIconKeys = new WeakMap<Phaser.Scene, string>()

export function preloadVoiceIcon(scene: Phaser.Scene, path = '/games/general/images/optimize/icon_voice.png') {
  const key = `${VOICE_ICON_KEY}:${path}`
  voiceIconKeys.set(scene, key)
  if (!scene.textures.exists(key)) {
    scene.load.image(key, path)
  }
}

export function createVoiceButton(scene: Phaser.Scene, onPlay: () => void) {
  const key = voiceIconKeys.get(scene) ?? VOICE_ICON_KEY
  if (scene.textures.exists(key)) {
    const icon = scene.add.image(0, 0, key).setDisplaySize(120, 120)
    return scene.add.container(0, 0, [icon]).setSize(106, 106)
      .setInteractive({ useHandCursor: true }).on('pointerdown', onPlay)
  }
  const background = scene.add.circle(0, 0, 50, 0xe0f2fe).setStrokeStyle(3, 0x38bdf8)
  const speaker = scene.add.text(0, 0, '🔊', { fontFamily: 'Arial, sans-serif', fontSize: '72px' }).setOrigin(0.5)
  speaker.setScale(Math.min(1, 78 / speaker.width, 78 / speaker.height))
  return scene.add.container(0, 0, [background, speaker]).setSize(106, 106)
    .setInteractive({ useHandCursor: true }).on('pointerdown', onPlay)
}
