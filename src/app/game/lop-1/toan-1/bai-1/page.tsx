import type { Metadata } from 'next'
import DragDropGame from '@/components/games/drag-drop/DragDropGame'

export const metadata: Metadata = {
  title: 'Các số 0, 1, 2, 3, 4, 5',
  description: 'Game kéo thả nhận biết và sắp xếp các số từ 0 đến 5 dành cho bé lớp 1.',
}

export default function Bai1Page() {
  return <main className="fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-sky-200 overscroll-none"><DragDropGame /></main>
}
