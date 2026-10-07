import { Suspense } from 'react'
import GameLoadingScreen from '@/components/games/general/GameLoadingScreen'
import GameClient from './GameClient'
export default function Page() { return <main className="flex h-dvh w-full items-center justify-center overflow-hidden bg-sky-200 overscroll-none"><Suspense fallback={<GameLoadingScreen />}><GameClient /></Suspense></main> }
