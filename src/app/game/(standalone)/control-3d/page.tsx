import type { Metadata } from 'next'
import Control3DClient from './Control3DClient'

export const metadata: Metadata = {
  title: 'P1 3D Shooter',
  description: 'Game bắn quái 3D cùng tay cầm điện thoại trong mạng nội bộ.',
}

export default function Control3DPage() {
  return <Control3DClient />
}
