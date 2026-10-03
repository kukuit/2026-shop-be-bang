import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

// GLTFExporter targets browsers; this tiny adapter gives its Blob reads the
// equivalent browser FileReader callbacks when running the asset tool in Node.
globalThis.FileReader ??= class NodeFileReader {
  result = null
  onloadend = null
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
  async readAsDataURL(blob) {
    this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`
    this.onloadend?.()
  }
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(projectRoot, 'public/games/3d/characters/cappy.glb')
const scene = new THREE.Group()
scene.name = 'CappyCharacter'

const mat = (name, color, roughness = 0.82) => {
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
  material.name = name
  return material
}

const materials = {
  fur: mat('Fur', '#f28b1d'),
  furLight: mat('Muzzle', '#ffc27a'),
  muzzleDark: mat('MuzzleShade', '#984d25'),
  nose: mat('Nose', '#60351f', 0.38),
  eyeWhite: mat('EyeWhite', '#fffdf7', 0.28),
  eye: mat('Eye', '#271b18', 0.24),
  highlight: mat('Highlight', '#ffffff', 0.2),
  cheek: mat('Cheek', '#f87978'),
  innerEar: mat('InnerEar', '#d7473e'),
  tooth: mat('Tooth', '#fff6df', 0.32),
  tongue: mat('Tongue', '#ed4556', 0.42),
  smile: mat('Smile', '#5a3326'),
  paw: mat('Paw', '#82533c'),
}

const bones = new Map()
function bone(name, parent, position) {
  const node = new THREE.Bone()
  node.name = name
  node.position.set(...position)
  parent.add(node)
  bones.set(name, node)
  return node
}

const root = new THREE.Bone()
root.name = 'Root'
scene.add(root)
const hips = bone('Hips', root, [0, 0.53, 0])
const spine = bone('Spine', hips, [0, 0.26, 0])
const chest = bone('Chest', spine, [0, 0.25, 0])
const neck = bone('Neck', chest, [0, 0.32, 0])
const head = bone('Head', neck, [0, 0.26, 0])

const leftUpperArm = bone('LeftUpperArm', chest, [-0.37, 0.12, 0])
const leftLowerArm = bone('LeftLowerArm', leftUpperArm, [0, -0.24, 0])
bone('LeftHand', leftLowerArm, [0, -0.2, 0.025])
const rightUpperArm = bone('RightUpperArm', chest, [0.37, 0.12, 0])
const rightLowerArm = bone('RightLowerArm', rightUpperArm, [0, -0.24, 0])
bone('RightHand', rightLowerArm, [0, -0.2, 0.025])
const leftUpperLeg = bone('LeftUpperLeg', hips, [-0.19, -0.08, 0])
const leftLowerLeg = bone('LeftLowerLeg', leftUpperLeg, [0, -0.28, 0])
bone('LeftFoot', leftLowerLeg, [0, -0.18, 0.025])
const rightUpperLeg = bone('RightUpperLeg', hips, [0.19, -0.08, 0])
const rightLowerLeg = bone('RightLowerLeg', rightUpperLeg, [0, -0.28, 0])
bone('RightFoot', rightLowerLeg, [0, -0.18, 0.025])
bone('HeadAttachment', head, [0, 0.55, 0])
bone('BackAttachment', chest, [0, 0, -0.45])
bone('LeftHandAttachment', bones.get('LeftHand'), [0, 0, 0.05])
bone('RightHandAttachment', bones.get('RightHand'), [0, 0, 0.05])

const sphereGeometry = new THREE.SphereGeometry(1, 20, 14)
const capsuleGeometry = (radius, length) => new THREE.CapsuleGeometry(radius, length, 5, 10)
function mesh(parent, name, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material)
  object.name = name
  object.position.set(...position)
  object.scale.set(...scale)
  object.rotation.set(...rotation)
  object.castShadow = true
  object.receiveShadow = true
  parent.add(object)
  return object
}
function ellipsoid(parent, name, material, position, scale) {
  return mesh(parent, name, sphereGeometry, material, position, scale)
}
function capsule(parent, name, material, position, radius, length, rotation = [0, 0, 0]) {
  return mesh(parent, name, capsuleGeometry(radius, length), material, position, [1, 1, 1], rotation)
}
function tube(parent, name, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)))
  const object = mesh(parent, name, new THREE.TubeGeometry(curve, 16, radius, 7, false), material, [0, 0, 0])
  return object
}

// A round, plush body and oversized head match the bright reference mascot.
ellipsoid(chest, 'BellyPatch', materials.furLight, [0, -0.24, 0.31], [0.31, 0.32, 0.09])
ellipsoid(hips, 'Tail', materials.fur, [0, 0.04, -0.31], [0.12, 0.13, 0.15])

// Articulated short legs with broad feet.
for (const [side, upper, lower, foot] of [
  ['Left', leftUpperLeg, bones.get('LeftLowerLeg'), bones.get('LeftFoot')],
  ['Right', rightUpperLeg, bones.get('RightLowerLeg'), bones.get('RightFoot')],
]) {
  capsule(upper, `${side}Thigh`, materials.fur, [0, -0.13, 0], 0.14, 0.19)
  capsule(lower, `${side}Shin`, materials.fur, [0, -0.1, 0], 0.115, 0.16)
  ellipsoid(foot, `${side}FootMesh`, materials.paw, [0, 0.075, 0.11], [0.18, 0.11, 0.25])
  for (const offset of [-0.07, 0, 0.07]) {
    ellipsoid(foot, `${side}Toe${Math.round((offset + 0.08) * 100)}`, materials.furLight, [offset, 0.045, 0.29], [0.025, 0.022, 0.035])
  }
}

// Soft arms with separate elbow, wrist and hand pivots.
for (const [side, upper, lower, hand, sign] of [
  ['Left', leftUpperArm, leftLowerArm, bones.get('LeftHand'), -1],
  ['Right', rightUpperArm, rightLowerArm, bones.get('RightHand'), 1],
]) {
  capsule(upper, `${side}UpperArmMesh`, materials.fur, [0, -0.11, 0], 0.12, 0.15)
  ellipsoid(upper, `${side}Shoulder`, materials.fur, [sign * -0.015, -0.02, 0], [0.145, 0.15, 0.14])
  capsule(lower, `${side}Forearm`, materials.furLight, [0, -0.1, 0], 0.105, 0.15)
  ellipsoid(hand, `${side}HandMesh`, materials.furLight, [0, -0.015, 0.015], [0.12, 0.105, 0.12])
}

// Large friendly capybara head, muzzle, sparkling eyes, cheeks and smile.
ellipsoid(head, 'HeadMesh', materials.fur, [0, 0.13, 0], [0.57, 0.55, 0.47])
for (const sign of [-1, 1]) {
  ellipsoid(head, `Ear${sign}`, materials.fur, [sign * 0.43, 0.39, -0.035], [0.15, 0.16, 0.12])
  ellipsoid(head, `InnerEar${sign}`, materials.innerEar, [sign * 0.43, 0.4, 0.07], [0.085, 0.095, 0.03])
  ellipsoid(head, `EyeWhite${sign}`, materials.eyeWhite, [sign * 0.22, 0.23, 0.405], [0.15, 0.17, 0.085])
  ellipsoid(head, `Eye${sign}`, materials.eye, [sign * 0.21, 0.23, 0.473], [0.098, 0.13, 0.052])
  ellipsoid(head, `EyeHighlight${sign}`, materials.highlight, [sign * 0.21 - 0.028, 0.281, 0.517], [0.035, 0.04, 0.021])
  ellipsoid(head, `EyeGlint${sign}`, materials.highlight, [sign * 0.21 + 0.034, 0.2, 0.522], [0.015, 0.018, 0.01])
  ellipsoid(head, `Cheek${sign}`, materials.cheek, [sign * 0.405, -0.065, 0.33], [0.105, 0.065, 0.032])
  ellipsoid(head, `WhiskerDot${sign}`, materials.muzzleDark, [sign * 0.23, -0.19, 0.59], [0.018, 0.018, 0.012])
  tube(head, `Eyebrow${sign}`, [[sign * 0.34, 0.43, 0.4], [sign * 0.23, 0.48, 0.45], [sign * 0.12, 0.44, 0.46]], 0.027, materials.muzzleDark)
}
ellipsoid(head, 'Muzzle', materials.furLight, [0, -0.13, 0.39], [0.37, 0.27, 0.3])
ellipsoid(head, 'Nose', materials.nose, [0, -0.065, 0.665], [0.145, 0.095, 0.075])
ellipsoid(head, 'NoseGlint', materials.highlight, [-0.04, -0.025, 0.73], [0.028, 0.017, 0.011])
for (const sign of [-1, 1]) ellipsoid(head, `Nostril${sign}`, materials.smile, [sign * 0.052, -0.06, 0.722], [0.016, 0.012, 0.009])
ellipsoid(head, 'OpenSmile', materials.smile, [0, -0.3, 0.59], [0.16, 0.17, 0.055])
ellipsoid(head, 'Tongue', materials.tongue, [0, -0.39, 0.638], [0.09, 0.055, 0.018])
for (const sign of [-1, 1]) ellipsoid(head, `FrontTooth${sign}`, materials.tooth, [sign * 0.043, -0.195, 0.638], [0.042, 0.058, 0.025])

// Three soft fur tufts replace the explorer cap in the visual reference.
ellipsoid(head, 'HairTuftBase', materials.fur, [0, 0.57, -0.015], [0.18, 0.105, 0.15])
mesh(head, 'HairTuftLeft', new THREE.ConeGeometry(0.105, 0.28, 8), materials.fur, [-0.07, 0.66, 0], [1, 1, 0.85], [0, 0, -0.35])
mesh(head, 'HairTuftRight', new THREE.ConeGeometry(0.11, 0.32, 8), materials.fur, [0.055, 0.67, -0.025], [1, 1, 0.85], [0, 0, 0.25])

// One weighted torso mesh deforms across the pelvis, spine and chest bones.
const bodyGeometry = new THREE.SphereGeometry(1, 24, 18)
bodyGeometry.applyMatrix4(new THREE.Matrix4().compose(
  new THREE.Vector3(0, 0.92, -0.015),
  new THREE.Quaternion(),
  new THREE.Vector3(0.43, 0.55, 0.35),
))
const bodyPosition = bodyGeometry.getAttribute('position')
const skinIndices = []
const skinWeights = []
const hipIndex = [...bones.keys()].indexOf('Hips')
const spineIndex = [...bones.keys()].indexOf('Spine')
const chestIndex = [...bones.keys()].indexOf('Chest')
for (let index = 0; index < bodyPosition.count; index += 1) {
  const y = bodyPosition.getY(index)
  let firstBone, secondBone, firstWeight
  if (y < 0.8) {
    firstBone = hipIndex
    secondBone = spineIndex
    firstWeight = THREE.MathUtils.clamp((0.8 - y) / 0.25, 0, 1)
  } else if (y < 1.05) {
    firstBone = spineIndex
    secondBone = chestIndex
    firstWeight = THREE.MathUtils.clamp((1.05 - y) / 0.25, 0, 1)
  } else {
    firstBone = chestIndex
    secondBone = chestIndex
    firstWeight = 1
  }
  skinIndices.push(firstBone, secondBone, 0, 0)
  skinWeights.push(firstWeight, 1 - firstWeight, 0, 0)
}
bodyGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4))
bodyGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4))
const bodyMesh = new THREE.SkinnedMesh(bodyGeometry, materials.fur)
bodyMesh.name = 'Body'
bodyMesh.castShadow = true
bodyMesh.receiveShadow = true
scene.add(bodyMesh)
const skeleton = new THREE.Skeleton([...bones.values()])
root.updateMatrixWorld(true)
skeleton.calculateInverses()
bodyMesh.bind(skeleton)
bodyMesh.normalizeSkinWeights()

function quaternionTrack(nodeName, axis, values, times) {
  const data = []
  for (const angle of values) {
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle)
    data.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
  }
  return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, data)
}
function vectorTrack(nodeName, property, values, times) {
  return new THREE.VectorKeyframeTrack(`${nodeName}.${property}`, times, values.flat())
}

const xAxis = new THREE.Vector3(1, 0, 0)
const zAxis = new THREE.Vector3(0, 0, 1)
const clips = [
  new THREE.AnimationClip('Idle', 2, [
    vectorTrack('Chest', 'scale', [[1, 1, 1], [1.012, 1.018, 1.012], [1, 1, 1]], [0, 1, 2]),
    quaternionTrack('Head', zAxis, [-0.025, 0.025, -0.025], [0, 1, 2]),
    quaternionTrack('LeftUpperArm', xAxis, [0, -0.035, 0], [0, 1, 2]),
    quaternionTrack('RightUpperArm', zAxis, [0, 1.35, 1.15, 1.35, 0], [0, 0.45, 0.9, 1.35, 2]),
    quaternionTrack('RightLowerArm', zAxis, [0, 0.24, -0.22, 0.24, 0], [0, 0.45, 0.9, 1.35, 2]),
  ]),
  new THREE.AnimationClip('Walk', 0.8, [
    quaternionTrack('LeftUpperLeg', xAxis, [0.42, 0, -0.42, 0, 0.42], [0, 0.2, 0.4, 0.6, 0.8]),
    quaternionTrack('RightUpperLeg', xAxis, [-0.42, 0, 0.42, 0, -0.42], [0, 0.2, 0.4, 0.6, 0.8]),
    quaternionTrack('LeftLowerLeg', xAxis, [0.05, 0.16, 0.08, 0.02, 0.05], [0, 0.2, 0.4, 0.6, 0.8]),
    quaternionTrack('RightLowerLeg', xAxis, [0.08, 0.02, 0.05, 0.16, 0.08], [0, 0.2, 0.4, 0.6, 0.8]),
    quaternionTrack('LeftUpperArm', xAxis, [-0.32, 0, 0.32, 0, -0.32], [0, 0.2, 0.4, 0.6, 0.8]),
    quaternionTrack('RightUpperArm', xAxis, [0.32, 0, -0.32, 0, 0.32], [0, 0.2, 0.4, 0.6, 0.8]),
  ]),
  new THREE.AnimationClip('Run', 0.52, [
    quaternionTrack('Spine', xAxis, [0.08, 0.12, 0.08], [0, 0.26, 0.52]),
    quaternionTrack('LeftUpperLeg', xAxis, [0.78, 0, -0.78, 0, 0.78], [0, 0.13, 0.26, 0.39, 0.52]),
    quaternionTrack('RightUpperLeg', xAxis, [-0.78, 0, 0.78, 0, -0.78], [0, 0.13, 0.26, 0.39, 0.52]),
    quaternionTrack('LeftLowerLeg', xAxis, [0.12, 0.68, 0.1, 0.05, 0.12], [0, 0.13, 0.26, 0.39, 0.52]),
    quaternionTrack('RightLowerLeg', xAxis, [0.1, 0.05, 0.12, 0.68, 0.1], [0, 0.13, 0.26, 0.39, 0.52]),
    quaternionTrack('LeftUpperArm', xAxis, [-0.58, 0.08, 0.58, 0.08, -0.58], [0, 0.13, 0.26, 0.39, 0.52]),
    quaternionTrack('RightUpperArm', xAxis, [0.58, -0.08, -0.58, -0.08, 0.58], [0, 0.13, 0.26, 0.39, 0.52]),
    quaternionTrack('Head', xAxis, [0.02, 0.05, 0.02], [0, 0.26, 0.52]),
  ]),
  new THREE.AnimationClip('JumpStart', 0.24, [
    quaternionTrack('LeftUpperLeg', xAxis, [0, 0.48, 0.08], [0, 0.12, 0.24]),
    quaternionTrack('RightUpperLeg', xAxis, [0, 0.48, 0.08], [0, 0.12, 0.24]),
    quaternionTrack('LeftUpperArm', zAxis, [0, 0.52, 0.4], [0, 0.12, 0.24]),
    quaternionTrack('RightUpperArm', zAxis, [0, -0.52, -0.4], [0, 0.12, 0.24]),
    quaternionTrack('Chest', xAxis, [0, -0.08, 0.1], [0, 0.12, 0.24]),
  ]),
  new THREE.AnimationClip('JumpLoop', 0.45, [
    quaternionTrack('LeftUpperLeg', xAxis, [0.22, 0.3, 0.22], [0, 0.225, 0.45]),
    quaternionTrack('RightUpperLeg', xAxis, [0.22, 0.3, 0.22], [0, 0.225, 0.45]),
    quaternionTrack('LeftLowerLeg', xAxis, [0.35, 0.5, 0.35], [0, 0.225, 0.45]),
    quaternionTrack('RightLowerLeg', xAxis, [0.35, 0.5, 0.35], [0, 0.225, 0.45]),
    quaternionTrack('LeftUpperArm', zAxis, [0.55, 0.65, 0.55], [0, 0.225, 0.45]),
    quaternionTrack('RightUpperArm', zAxis, [-0.55, -0.65, -0.55], [0, 0.225, 0.45]),
  ]),
  new THREE.AnimationClip('JumpLand', 0.28, [
    quaternionTrack('LeftUpperLeg', xAxis, [0.12, 0.52, 0], [0, 0.11, 0.28]),
    quaternionTrack('RightUpperLeg', xAxis, [0.12, 0.52, 0], [0, 0.11, 0.28]),
    quaternionTrack('LeftLowerLeg', xAxis, [0.08, 0.36, 0], [0, 0.11, 0.28]),
    quaternionTrack('RightLowerLeg', xAxis, [0.08, 0.36, 0], [0, 0.11, 0.28]),
    quaternionTrack('Chest', xAxis, [0.08, -0.06, 0], [0, 0.11, 0.28]),
    quaternionTrack('LeftUpperArm', zAxis, [0.4, 0.1, 0], [0, 0.11, 0.28]),
    quaternionTrack('RightUpperArm', zAxis, [-0.4, -0.1, 0], [0, 0.11, 0.28]),
  ]),
]

scene.updateMatrixWorld(true)
const exporter = new GLTFExporter()
const glb = await exporter.parseAsync(scene, { binary: true, animations: clips, trs: true })
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, Buffer.from(glb))
console.log(`Generated ${path.relative(projectRoot, outputPath)} (${Buffer.byteLength(glb)} bytes)`)
