'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import type { LessonMapItem } from '@/components/games/lesson-map/data'
import VietnameseBridge from './VietnameseBridge'
import VietnameseLessonNode from './VietnameseLessonNode'
import {
  VietnameseEntrySign,
  VietnameseFlowers,
  VietnameseIsland,
  VietnameseKnowledgeTree,
  VietnamesePaths,
  VietnamesePlaza,
  VietnameseReadingHut,
  VietnameseRocks,
  VietnameseTrees,
} from './VietnameseWorldScenery'
import { buildVietnameseLessonNodes } from './vietnamese-world.config'

type Props = {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onHousePorchChange: (inside: boolean) => void
  onVietnameseLessonApproachChange?: (id: number | null) => void
  planetItems?: LessonMapItem[]
}

export default function VietnameseEnvironment({ playerRef, onVietnameseLessonApproachChange, planetItems }: Props) {
  const approachedLesson = useRef<number | null>(null)
  const lessons = useMemo(() => buildVietnameseLessonNodes(planetItems ?? []), [planetItems])

  useFrame(() => {
    const position = playerRef.current?.translation()
    let nearestId: number | null = null
    let nearestDistance = 4.7
    if (position) {
      for (const lesson of lessons) {
        const distance = Math.hypot(position.x - lesson.position[0], position.z - lesson.position[2])
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestId = lesson.id
        }
      }
    }
    if (nearestId !== approachedLesson.current) {
      approachedLesson.current = nearestId
      onVietnameseLessonApproachChange?.(nearestId)
    }
  })

  return <>
    <VietnameseIsland />
    <VietnameseBridge />
    <VietnamesePaths />
    <VietnameseEntrySign />
    <VietnamesePlaza />
    <VietnameseReadingHut />
    <VietnameseKnowledgeTree />
    <VietnameseTrees />
    <VietnameseRocks />
    <VietnameseFlowers />
    {lessons.map((lesson) => <VietnameseLessonNode key={lesson.lessonId} lesson={lesson} active={approachedLesson.current === lesson.id} />)}
  </>
}
