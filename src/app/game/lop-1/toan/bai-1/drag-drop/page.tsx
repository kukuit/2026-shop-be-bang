import type { Metadata } from 'next'
import DragDropGame from '@/components/games/drag-drop/DragDropGame'

export const metadata: Metadata = {
  title: 'Kéo thả số - Toán lớp 1',
  description: 'Trò chơi kéo thả nhận biết và sắp xếp các số từ 0 đến 5 dành cho bé lớp 1.',
}

export default function DragDropPage() {
  return <main className="fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-sky-200 overscroll-none"><DragDropGame /></main>
}
