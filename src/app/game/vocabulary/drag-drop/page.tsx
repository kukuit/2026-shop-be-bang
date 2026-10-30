import type { Metadata } from 'next'
import VocabularyDragDropClient from './VocabularyDragDropClient'

export const metadata: Metadata = {
  title: 'Vocabulary 3000 · Kéo thả',
  description: 'Luyện từ vựng tiếng Anh qua trò chơi kéo thả ghép từ, nghĩa, hình và âm thanh.',
}

export default function VocabularyDragDropPage() {
  return <VocabularyDragDropClient />
}
