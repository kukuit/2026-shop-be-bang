import * as Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './constants'
import { RacingScene } from './RacingScene'
import type { RacingGameConfig } from './types'

type Callbacks = { onProgress: (progress: number) => void; onReady: () => void }

export const createRacingConfig = (parent: HTMLElement, lesson: RacingGameConfig, callbacks: Callbacks): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#27b8f3',
  scene: [new RacingScene(lesson)],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_WIDTH, height: GAME_HEIGHT },
  render: { antialias: true, roundPixels: true },
  callbacks: {
    preBoot: (game) => {
      game.events.on('racing:progress', callbacks.onProgress)
      game.events.once('racing:ready', callbacks.onReady)
    },
  },
})
