import type { Metadata } from 'next'
import Control2DClient from './Control2DClient'

export const metadata: Metadata = {
  title: 'Rừng săn quái · 2 người chơi',
  description: 'Game bắn quái phối hợp hai người chơi bằng tay cầm điện thoại trong mạng nội bộ.',
}

export default function Control2DPage() {
  return <Control2DClient />
}
