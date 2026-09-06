import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type GameNavigationItem = {
  title: string
  href: string
  grade?: number
  artwork?: { src: string; x: number; y: number; width: number; height: number; sheetWidth: number; sheetHeight: number }
}
export type GameBreadcrumb = { label: string; href?: string }

type Props = {
  title?: string
  description?: string
  items: readonly GameNavigationItem[]
  breadcrumbs: readonly GameBreadcrumb[]
}

export default function GameNavigationGrid({ title, description, items, breadcrumbs }: Props) {
  const hasArtwork = items.some((item) => item.artwork)
  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-to-b from-sky-50 to-pink-50 px-4 py-7 md:px-6 md:py-10">
      <section className="relative mx-auto max-w-6xl">
        {breadcrumbs.length > 0 && <nav aria-label="Điều hướng trò chơi" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold text-slate-600">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="contents">
              {index > 0 && <ChevronRight size={18} className="shrink-0" aria-hidden="true" />}
              {item.href ? (
                <Link href={item.href} className="text-blue-700 hover:text-blue-800">{item.label}</Link>
              ) : (
                <span className="text-slate-800" aria-current="page">{item.label}</span>
              )}
            </span>
          ))}
        </nav>}

        {(title || description) && <div className={breadcrumbs.length > 0 ? 'mt-5 md:mt-7' : undefined}>
          {title && <h1 className="text-2xl font-black leading-snug text-slate-800 md:text-[2rem]">{title}</h1>}
          {description && <p className="mt-2 font-semibold text-slate-500">{description}</p>}
        </div>}

        <div className={`mt-5 grid gap-3 md:mt-7 md:gap-5 ${hasArtwork ? 'w-full grid-cols-2 sm:w-3/4 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {items.map((item, index) => (
            <Link key={item.href} href={item.href} style={item.artwork ? { aspectRatio: `${item.artwork.width} / ${item.artwork.height}` } : undefined} className="group relative aspect-square overflow-hidden rounded-2xl border-[3px] border-white bg-gradient-to-br from-sky-400 via-blue-500 to-violet-600 shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 md:rounded-[2rem]">
              {item.artwork ? <>
                <div aria-hidden="true" className="absolute inset-0 bg-no-repeat transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none" style={{
                  backgroundImage: `url("${item.artwork.src}")`,
                  backgroundSize: `${item.artwork.sheetWidth / item.artwork.width * 100}% ${item.artwork.sheetHeight / item.artwork.height * 100}%`,
                  backgroundPosition: `${item.artwork.x / (item.artwork.sheetWidth - item.artwork.width) * 100}% ${item.artwork.y / (item.artwork.sheetHeight - item.artwork.height) * 100}%`,
                }} />
                <span className="absolute left-2 right-8 top-3 text-base font-black leading-tight text-white drop-shadow-md sm:left-3 sm:right-14 sm:top-5 sm:text-2xl">{item.title}</span>
              </> : <>
              <div className="absolute inset-0 opacity-25" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle at 25% 22%, white 0 3px, transparent 4px), radial-gradient(circle at 75% 35%, white 0 5px, transparent 6px)' }} />
              <div className="absolute inset-0 grid place-items-center p-4 text-center">
                <span className="text-2xl font-black text-white drop-shadow-md md:text-4xl">{item.title}</span>
              </div>
              </>}
              {item.grade ? <span className="absolute right-2 top-2 text-3xl font-black leading-none text-white drop-shadow-md sm:right-3 sm:top-3 sm:text-5xl"><span className="sr-only">Lớp </span>{item.grade}</span> : <span aria-hidden="true" className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black text-white backdrop-blur-sm md:right-4 md:top-4">{String(index + 1).padStart(2, '0')}</span>}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
