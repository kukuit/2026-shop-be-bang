import * as Phaser from 'phaser'
import { BubbleMathScene } from './scenes/BubbleMathScene'

type GameLoadingCallbacks = {
  onProgress: (progress: number) => void
  onReady: () => void
}

export const createGameConfig = (
  parent: HTMLElement,
  { onProgress, onReady }: GameLoadingCallbacks,
): Phaser.Types.Core.GameConfig => ({
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
  callbacks: {
    preBoot: (game) => {
      game.events.on('bubble-shooter:load-progress', onProgress)
      game.events.once('bubble-shooter:ready', onReady)
    },
  },
})
