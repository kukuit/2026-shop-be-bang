import GameLoadingScreen from '@/components/games/bubble-shooter/GameLoadingScreen'

export default function Loading() {
  return (
    <main className="fixed inset-0 h-dvh w-screen overflow-hidden bg-sky-200">
      <GameLoadingScreen />
    </main>
  )
}
