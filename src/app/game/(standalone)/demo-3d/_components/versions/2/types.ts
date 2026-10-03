export type PortalId = 'math' | 'vietnamese' | 'english' | 'home'
export type PortalInfo = { id: PortalId; title: string; description: string; color: string }
export type MoveInput = { x: number; z: number }
export const PORTALS: PortalInfo[] = [
  { id: 'math', title: 'QUẦN ĐẢO TOÁN', description: 'Khám phá các thử thách Toán học', color: '#34c9ff' },
  { id: 'vietnamese', title: 'VÙNG ĐẤT TIẾNG VIỆT', description: 'Cùng Cappy khám phá thế giới chữ và tiếng', color: '#6be390' },
  { id: 'english', title: 'VŨ TRỤ TIẾNG ANH', description: 'Bắt đầu chuyến phiêu lưu tiếng Anh', color: '#bb8cff' },
  { id: 'home', title: 'NHÀ CAPPY', description: 'Ghé thăm ngôi nhà nhỏ của Cappy', color: '#ffbf61' },
]
