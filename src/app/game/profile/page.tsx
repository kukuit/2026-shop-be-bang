import GameAuthHeader from '@/components/auth/GameAuthHeader'
import { PrimaryGradeEditor } from '@/components/games/profile/GradeControls'

export default function GameProfilePage() {
  return <><GameAuthHeader /><main className="min-h-[80vh] bg-sky-50 py-7 md:py-10"><div className="game-container"><h1 className="mb-6 text-2xl font-black text-slate-800">Hồ sơ của bé</h1><PrimaryGradeEditor /></div></main></>
}
