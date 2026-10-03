export type MathIslandStatus = 'completed' | 'current' | 'available' | 'locked'
export type MathIslandTheme = 'house' | 'windmill' | 'cave' | 'lighthouse' | 'tower' | 'waterfall'

export type MathIslandConfig = {
  id: number
  title: string
  position: [number, number, number]
  dockPosition: [number, number, number]
  radius: number
  theme: MathIslandTheme
  status: MathIslandStatus
  route?: string
}

// Only this nearby MVP sector is loaded as full geometry. New lesson data can
// be added in six-island sectors without mounting all 41 lessons at once.
export const MATH_ISLANDS: MathIslandConfig[] = [
  { id: 1, title: 'Bài 1', position: [-7, 0, -24], dockPosition: [-1.7, 0, -21.6], radius: 5.4, theme: 'house', status: 'current', route: '/game/lop-1/toan/bai-1' },
  { id: 2, title: 'Bài 2', position: [8, 0, -42], dockPosition: [3.1, 0, -39.7], radius: 5.5, theme: 'windmill', status: 'available', route: '/game/lop-1/toan/bai-2' },
  { id: 3, title: 'Bài 3', position: [-10, 0, -62], dockPosition: [-4.7, 0, -59.8], radius: 5.6, theme: 'cave', status: 'locked' },
  { id: 4, title: 'Bài 4', position: [11, 0, -82], dockPosition: [5.6, 0, -79.5], radius: 5.6, theme: 'lighthouse', status: 'locked' },
  { id: 5, title: 'Bài 5', position: [-4, 0, -105], dockPosition: [1.3, 0, -102.6], radius: 5.8, theme: 'tower', status: 'locked' },
  { id: 6, title: 'Bài 6', position: [10, 0, -128], dockPosition: [4.7, 0, -125.6], radius: 5.8, theme: 'waterfall', status: 'locked' },
]

export const MATH_STATUS_COLORS: Record<MathIslandStatus, string> = {
  completed: '#55c982',
  current: '#39b9ec',
  available: '#fff2cb',
  locked: '#9baeb6',
}

export const MATH_ROUTE_BUOYS: [number, number, number][] = [
  [-0.8, 0.18, -7], [-3.2, 0.18, -13], [-5.1, 0.18, -18],
  [-5.2, 0.18, -30], [-1.4, 0.18, -35], [3.6, 0.18, -38],
  [2.7, 0.18, -49], [-1.2, 0.18, -55], [-3.1, 0.18, -67],
]
