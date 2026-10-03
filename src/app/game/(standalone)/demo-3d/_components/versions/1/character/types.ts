import type { MutableRefObject } from 'react'

export const STANDARD_CHARACTER_HEIGHT = 2.3

export type CharacterAnimationState = 'idle' | 'walk' | 'run' | 'jumpStart' | 'jumpLoop' | 'jumpLand'

export type StandardRigBone =
  | 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'leftUpperArm' | 'leftLowerArm' | 'leftHand'
  | 'rightUpperArm' | 'rightLowerArm' | 'rightHand'
  | 'leftUpperLeg' | 'leftLowerLeg' | 'leftFoot'
  | 'rightUpperLeg' | 'rightLowerLeg' | 'rightFoot'

export type StandardRigMap = Partial<Record<StandardRigBone, string>>

export type CharacterDefinition = {
  id: string
  name: string
  modelUrl?: string
  height: number
  scale: number
  rigType: 'standard-cappy'
  rig: StandardRigMap
  collider: { radius: number; halfHeight: number }
  visual: { rootOffsetY: number; temporaryRenderer?: 'cappy-proxy' }
  camera: { targetHeight: number; firstPersonHeight: number; headHeight: number }
  animations: Partial<Record<CharacterAnimationState, string>>
  attachmentPoints: Partial<Record<'head' | 'back' | 'leftHand' | 'rightHand', string>>
}

export type CharacterSkinDefinition = {
  id: string
  name: string
  modelUrl?: string
  materials?: Partial<Record<'fur' | 'muzzle' | 'accent', string>>
  materialOverrides?: Record<string, string>
  accessories?: Partial<Record<'head' | 'back' | 'leftHand' | 'rightHand', string>>
}

export type CharacterMotion = {
  speed: number
  verticalVelocity: number
  grounded: boolean
  jumpStarted: boolean
  justLanded: boolean
}

export type CharacterMotionRef = MutableRefObject<CharacterMotion>
