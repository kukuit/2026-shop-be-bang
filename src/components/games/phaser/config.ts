import * as Phaser from 'phaser'
import { BubbleMathScene } from './scenes/BubbleMathScene'

export const createGameConfig = (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 720,
  height: 1280,
  backgroundColor: '#bde9ff',
  scene: [BubbleMathScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  render: { antialias: true, roundPixels: true },
})
