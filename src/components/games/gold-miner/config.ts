import * as Phaser from 'phaser'
import { GoldMinerScene } from './GoldMinerScene'

type Callbacks = { onReady: () => void }

export const createGoldMinerConfig = (parent: HTMLElement, callbacks: Callbacks): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 720,
  height: 1280,
  backgroundColor: '#3b1c0d',
  scene: [GoldMinerScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 1280 },
  render: { antialias: true, roundPixels: true },
  callbacks: {
    preBoot: (game) => {
      game.events.once('gold-miner:ready', callbacks.onReady)
    },
  },
})
