export type PortalId = 'english'
export type PortalInfo = { id: PortalId; title: string; description: string; color: string }
export type MoveInput = { x: number; z: number; y?: number }

export const PORTALS: PortalInfo[] = [
  { id: 'english', title: 'VŨ TRỤ TIẾNG ANH', description: 'Bắt đầu chuyến phiêu lưu tiếng Anh', color: '#bb8cff' },
]
