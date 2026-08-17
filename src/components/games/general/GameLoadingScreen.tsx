type GameLoadingScreenProps = {
  progress?: number
}

export default function GameLoadingScreen({ progress }: GameLoadingScreenProps) {
  const percentage = progress === undefined ? undefined : Math.round(progress)

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-b from-sky-300 via-sky-200 to-cyan-100 px-8 text-center"
      role="status"
      aria-live="polite"
      aria-label={percentage === undefined ? 'Đang tải trò chơi' : `Đang tải trò chơi ${percentage}%`}
    >
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-ping rounded-full bg-white/40" />
        <div className="relative flex h-24 w-24 animate-bounce items-center justify-center rounded-full border-4 border-white bg-pink-500 text-5xl shadow-xl">
          🎈
        </div>
      </div>
      <h1 className="mt-8 text-2xl font-black text-sky-950">Đang chuẩn bị trò chơi...</h1>
      <p className="mt-2 text-sm font-semibold text-sky-800">Bé chờ một chút nhé!</p>
      <div className="mt-6 h-3 w-full max-w-xs overflow-hidden rounded-full bg-white/70 shadow-inner">
        {percentage === undefined ? (
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-pink-400 to-amber-400" />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400 transition-[width] duration-200 ease-out"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      {percentage !== undefined && <p className="mt-3 font-bold tabular-nums text-sky-900">{percentage}%</p>}
    </div>
  )
}
