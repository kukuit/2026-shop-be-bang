'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { LessonIslandSet, MathOcean, type MathDockTarget } from '../_components/world/MathWorld'
import MathWorld from '../_components/world/MathWorld'

export default function MathWorldCanvas({ onDockChange, onReady }: {
  onDockChange: (target: MathDockTarget) => void
  onReady: () => void
}) {
  return <Canvas camera={{ position: [0, 7, 18], fov: 55, near: 0.1, far: 260 }} dpr={[1, 1.3]} shadows={false} gl={{ antialias: false, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#9adff2']} />
    <hemisphereLight args={['#e6faff', '#679e87', 1.6]} />
    <ambientLight intensity={0.65} />
    <directionalLight position={[12, 20, 8]} intensity={1.25} castShadow={false} />
    <Suspense fallback={null}>
      <MathOcean />
      <LessonIslandSet />
      <MathWorld onDockChange={onDockChange} onReady={onReady} />
    </Suspense>
  </Canvas>
}
