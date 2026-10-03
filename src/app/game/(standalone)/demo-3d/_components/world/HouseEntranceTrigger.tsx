'use client'

import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import type { MutableRefObject } from 'react'
import { CAPPY_HOUSE, HOUSE_ENTRANCE_TRIGGER } from './houseConfig'

export default function HouseEntranceTrigger({ playerRef, onPorchChange }: {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onPorchChange: (inside: boolean) => void
}) {
  const wasInside = useRef(false)

  useFrame(() => {
    const position = playerRef.current?.translation()
    const deltaX = position ? position.x - CAPPY_HOUSE.position[0] : 0
    const deltaZ = position ? position.z - CAPPY_HOUSE.position[2] : 0
    const cos = Math.cos(CAPPY_HOUSE.rotation), sin = Math.sin(CAPPY_HOUSE.rotation)
    const localX = cos * deltaX - sin * deltaZ
    const localZ = sin * deltaX + cos * deltaZ
    const inside = position != null
      && localX >= HOUSE_ENTRANCE_TRIGGER.minX
      && localX <= HOUSE_ENTRANCE_TRIGGER.maxX
      && localZ >= HOUSE_ENTRANCE_TRIGGER.minZ
      && localZ <= HOUSE_ENTRANCE_TRIGGER.maxZ

    if (inside !== wasInside.current) {
      wasInside.current = inside
      onPorchChange(inside)
    }
  })

  return null
}
