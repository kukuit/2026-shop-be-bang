'use client'

import GameScene from './GameScene'
import type { CameraMode } from './camera-config'
import type { MoveInput, PortalInfo } from './types'
import VillageEnvironment from './world/VillageEnvironment'

type Props = {
  move: MoveInput
  jumpVersion: number
  soundOn: boolean
  cameraMode: CameraMode
  onPortalChange: (portal: PortalInfo | null) => void
  onHousePorchChange: (inside: boolean) => void
}

/** Compatibility entry point for the shared Village scene. */
export default function GameWorld(props: Props) {
  return <GameScene
    world="village"
    Environment={VillageEnvironment}
    move={props.move}
    jumpVersion={props.jumpVersion}
    soundOn={props.soundOn}
    cameraMode={props.cameraMode}
    onPortalChange={props.onPortalChange}
    onHousePorchChange={props.onHousePorchChange}
  />
}
