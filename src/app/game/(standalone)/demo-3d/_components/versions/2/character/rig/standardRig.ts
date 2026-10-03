import type { StandardRigMap } from '../types'
import type * as THREE from 'three'

/** Canonical semantic bones; each model maps these roles to its own node names. */
export const STANDARD_CAPPY_RIG: StandardRigMap = {
  root: 'Root',
  hips: 'Hips',
  spine: 'Spine',
  chest: 'Chest',
  neck: 'Neck',
  head: 'Head',
  leftUpperArm: 'LeftUpperArm',
  leftLowerArm: 'LeftLowerArm',
  leftHand: 'LeftHand',
  rightUpperArm: 'RightUpperArm',
  rightLowerArm: 'RightLowerArm',
  rightHand: 'RightHand',
  leftUpperLeg: 'LeftUpperLeg',
  leftLowerLeg: 'LeftLowerLeg',
  leftFoot: 'LeftFoot',
  rightUpperLeg: 'RightUpperLeg',
  rightLowerLeg: 'RightLowerLeg',
  rightFoot: 'RightFoot',
}

export function resolveStandardRig(root: THREE.Object3D, rig: StandardRigMap) {
  const resolved: Partial<Record<keyof StandardRigMap, THREE.Object3D>> = {}
  for (const [role, nodeName] of Object.entries(rig)) {
    if (!nodeName) continue
    const node = root.getObjectByName(nodeName)
    if (node) resolved[role as keyof StandardRigMap] = node
  }
  return resolved
}
