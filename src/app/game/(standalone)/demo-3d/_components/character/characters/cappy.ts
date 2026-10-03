import type { CharacterDefinition } from '../types'
import { STANDARD_CHARACTER_HEIGHT } from '../types'
import { STANDARD_CAPPY_RIG } from '../rig/standardRig'

/**
 * Gameplay dimensions stay aligned with the demo; this definition points to
 * the generated character asset and can be copied for future roster entries.
 */
export const CAPPY_CHARACTER: CharacterDefinition = {
  id: 'cappy',
  name: 'Cappy',
  modelUrl: '/games/3d/characters/cappy.glb',
  height: STANDARD_CHARACTER_HEIGHT,
  scale: 1,
  rigType: 'standard-cappy',
  rig: STANDARD_CAPPY_RIG,
  collider: { radius: 0.37, halfHeight: 0.85 },
  visual: { rootOffsetY: -1.225, temporaryRenderer: 'cappy-proxy' },
  camera: { targetHeight: 1.2, firstPersonHeight: 0.58, headHeight: 1.8 },
  animations: {
    idle: 'Idle', walk: 'Walk', run: 'Run',
    jumpStart: 'JumpStart', jumpLoop: 'JumpLoop', jumpLand: 'JumpLand',
  },
  attachmentPoints: {
    head: 'HeadAttachment', back: 'BackAttachment',
    leftHand: 'LeftHandAttachment', rightHand: 'RightHandAttachment',
  },
}
