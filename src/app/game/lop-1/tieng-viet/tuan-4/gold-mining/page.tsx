import { Suspense } from 'react'
import GameLoadingScreen from '@/components/games/general/GameLoadingScreen'
import GameClient from './GameClient'
export default function Page() { return <main className="flex h-dvh w-full items-center justify-center overflow-hidden bg-amber-100 overscroll-none"><Suspense fallback={<GameLoadingScreen />}><GameClient /></Suspense></main> }
