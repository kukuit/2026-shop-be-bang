'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import * as THREE from 'three'
import type { CharacterDefinition, CharacterMotionRef, CharacterSkinDefinition } from './types'
import { getCharacterModelPlacement } from './normalize-model'
import { resolveCharacterAnimationState } from './animation-state'
import { createCharacterActions, crossfadeCharacterAnimation } from './animation/CharacterAnimationController'
import { resolveStandardRig } from './rig/standardRig'

type Props = {
  character: CharacterDefinition
  skin: CharacterSkinDefinition
  modelUrl: string
  motion: CharacterMotionRef
}

export default function CharacterModel({ character, skin, modelUrl, motion }: Props) {
  const { scene, animations } = useGLTF(modelUrl)
  const model = useMemo(() => clone(scene), [scene])
  const placement = useMemo(() => getCharacterModelPlacement(model, character), [model, character])
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  const actions = useMemo(() => createCharacterActions(mixer, animations, character), [mixer, animations, character])
  const previousState = useRef<ReturnType<typeof resolveCharacterAnimationState> | null>(null)
  const jumpStartTime = useRef(0)
  const landingTime = useRef(0)
  const resolvedRig = useMemo(() => resolveStandardRig(model, character.rig), [model, character.rig])

  useEffect(() => {
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      const materials = Array.isArray(node.material) ? node.material : [node.material]
      for (const material of materials) {
        if (!('color' in material)) continue
        const colorMaterial = material as THREE.MeshStandardMaterial
        colorMaterial.userData.characterBaseColor ??= colorMaterial.color.clone()
        const semanticColor = material.name === 'Fur' ? skin.materials?.fur
          : material.name === 'Muzzle' ? skin.materials?.muzzle
            : material.name === 'Nose' ? skin.materials?.accent
              : undefined
        const color = skin.materialOverrides?.[material.name] ?? semanticColor
        if (color) colorMaterial.color.set(color)
        else colorMaterial.color.copy(colorMaterial.userData.characterBaseColor as THREE.Color)
      }
    })
    model.userData.standardRigNames = Object.fromEntries(
      Object.entries(resolvedRig).map(([role, node]) => [role, node?.name]),
    )
  }, [model, skin, resolvedRig])

  useFrame((_, delta) => {
    mixer.update(delta)
    if (motion.current.jumpStarted) jumpStartTime.current = 0.16
    else jumpStartTime.current = Math.max(0, jumpStartTime.current - delta)
    if (motion.current.justLanded) landingTime.current = 0.2
    else landingTime.current = Math.max(0, landingTime.current - delta)

    const state = landingTime.current > 0 ? 'jumpLand'
      : jumpStartTime.current > 0 ? 'jumpStart'
        : resolveCharacterAnimationState(motion.current)
    if (state !== previousState.current) {
      crossfadeCharacterAnimation(actions, previousState.current, state)
      previousState.current = state
    }
    const activeAction = actions[state]
    if (activeAction && (state === 'walk' || state === 'run')) {
      activeAction.timeScale = THREE.MathUtils.clamp(motion.current.speed / (state === 'walk' ? 2 : 5.6), 0.75, 1.35)
    }
  })

  return <group position-y={character.visual.rootOffsetY}>
    <primitive object={model} scale={placement.scale} position-y={placement.groundOffsetY} />
  </group>
}
