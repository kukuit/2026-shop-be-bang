import type { Metadata } from 'next'
import DragDropGame from '@/components/games/drag-drop/DragDropGame'

export const metadata: Metadata = {
  title: 'Kéo thả số | Shop Bé Băng',
  description: 'Trò chơi kéo thả số đơn giản dành cho bé lớp 1.',
}

export default function Bai1Page() {
  return (
    <main className="fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-sky-200 overscroll-none">
      <DragDropGame />
    </main>
  )
}
