import * as Phaser from 'phaser'
import { GoldMinerScene } from './GoldMinerScene'
import type { GoldMinerGameConfig } from './types'

type Callbacks = { onProgress: (progress: number) => void; onReady: () => void }

export const createGoldMinerConfig = (parent: HTMLElement, lesson: GoldMinerGameConfig, callbacks: Callbacks): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 720,
  height: 1280,
  backgroundColor: '#3b1c0d',
  scene: [new GoldMinerScene(lesson)],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 1280 },
  render: { antialias: true, roundPixels: true },
  callbacks: {
    preBoot: (game) => {
      game.events.on('gold-miner:progress', callbacks.onProgress)
      game.events.once('gold-miner:ready', callbacks.onReady)
    },
  },
})
