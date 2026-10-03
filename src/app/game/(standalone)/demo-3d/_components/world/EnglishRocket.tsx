'use client'

export default function EnglishRocket({ occupied = false, engineOn = false, flipTopBottom = false }: { occupied?: boolean; engineOn?: boolean; flipTopBottom?: boolean }) {
  return <group>
    <group rotation={flipTopBottom ? [0, Math.PI, 0] : [0, 0, 0]}>
      <mesh position={[0, 1.7, 0]} castShadow><cylinderGeometry args={[0.65, 0.82, 2.7, 10]} /><meshStandardMaterial color="#fff8f2" roughness={0.65} /></mesh>
      <mesh position={[0, 3.45, 0]} castShadow><coneGeometry args={[0.7, 1.25, 10]} /><meshStandardMaterial color="#9167d8" roughness={0.7} /></mesh>
      <mesh position={[0, 2.35, 0.64]}><sphereGeometry args={[0.42, 12, 8]} /><meshStandardMaterial color="#59c8e8" emissive="#2c93be" emissiveIntensity={0.3} transparent opacity={0.28} depthWrite={false} /></mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * 0.77, 0.7, 0]} rotation={[0, 0, side * 0.35]} castShadow><boxGeometry args={[0.48, 1.1, 0.7]} /><meshStandardMaterial color="#8871cf" /></mesh>)}
      <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.72, 0.85, 0.45, 10]} /><meshStandardMaterial color="#5bcef0" emissive="#28b9ef" emissiveIntensity={engineOn ? 1.5 : 0.12} /></mesh>
    </group>
    {occupied && <group position={[0, 2.35, flipTopBottom ? -0.62 : 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, -0.28, -0.04]} scale={[0.8, 0.85, 0.8]}><sphereGeometry args={[0.28, 9, 7]} /><meshStandardMaterial color="#b8784f" /></mesh>
      {[-1, 1].map((side) => <mesh key={`paw-${side}`} position={[side * 0.2, -0.12, 0.18]}><sphereGeometry args={[0.13, 7, 5]} /><meshStandardMaterial color="#d8a36c" /></mesh>)}
      <mesh position={[0, 0.02, 0.2]}><sphereGeometry args={[0.28, 10, 8]} /><meshStandardMaterial color="#d8a36c" /></mesh>
      {[-0.18, 0.18].map((x) => <mesh key={`ear-${x}`} position={[x, 0.13, 0.17]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color="#b67d50" /></mesh>)}
      {[-0.09, 0.09].map((x) => <mesh key={`eye-${x}`} position={[x, 0.26, 0.22]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#302642" /></mesh>)}
    </group>}
  </group>
}
