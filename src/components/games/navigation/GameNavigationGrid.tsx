import Link from 'next/link'
import Image from 'next/image'
import { Play } from 'lucide-react'

export type GameNavigationItem = {
  title: string
  href: string
  grade?: number
  imageSrc?: string
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
  const hasArtwork = items.some((item) => item.artwork || item.imageSrc)
  return (
    <main className="relative min-h-[calc(100dvh-58px)] overflow-hidden py-5 sm:py-8">
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">

        {(title || description) && <div className="rounded-[28px] border-2 border-white/80 bg-sky-950/30 px-5 py-4 text-white shadow-[0_7px_0_#164e6380] backdrop-blur-sm sm:px-7">
          {title && <h1 className="text-2xl font-black leading-snug drop-shadow md:text-4xl">{title}</h1>}
          {description && <p className="mt-1 font-bold text-sky-50">{description}</p>}
        </div>}

        <div className={`mt-5 grid gap-3 sm:gap-5 ${hasArtwork ? 'mx-auto max-w-6xl grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {items.map((item, index) => (
            <Link key={item.href} href={item.href} style={item.artwork ? { aspectRatio: `${item.artwork.width} / ${item.artwork.height}` } : undefined} className="group relative aspect-square overflow-hidden rounded-[26px] border-[3px] border-white bg-gradient-to-br from-sky-400 via-blue-500 to-violet-600 shadow-[0_7px_0_#164e6380,0_14px_24px_#164e6330] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300">
              {item.imageSrc ? <Image src={item.imageSrc} alt="" fill priority={index === 0} sizes="(min-width: 1200px) 275px, (min-width: 1024px) 23vw, (min-width: 640px) 36vw, 48vw" className="object-cover transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none" /> : item.artwork ? <>
                <div aria-hidden="true" className="absolute inset-0 bg-no-repeat transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none" style={{
                  backgroundImage: `url("${item.artwork.src}")`,
                  backgroundSize: `${item.artwork.sheetWidth / item.artwork.width * 100}% ${item.artwork.sheetHeight / item.artwork.height * 100}%`,
                  backgroundPosition: `${item.artwork.x / (item.artwork.sheetWidth - item.artwork.width) * 100}% ${item.artwork.y / (item.artwork.sheetHeight - item.artwork.height) * 100}%`,
                }} />

              </> : <>
              <div className="absolute inset-0 opacity-25" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle at 25% 22%, white 0 3px, transparent 4px), radial-gradient(circle at 75% 35%, white 0 5px, transparent 6px)' }} />
              <div className="absolute inset-0 grid place-items-center p-4 text-center">
                <span className="text-2xl font-black text-white drop-shadow-md md:text-4xl">{item.title}</span>
              </div>
              </>}
              {(item.imageSrc || item.artwork) && <><span className="absolute bottom-2 left-3 right-12 max-w-[75%] text-base font-black leading-tight text-white [text-shadow:0_2px_3px_#082f49,0_0_8px_#082f49] sm:bottom-3 sm:left-5 sm:right-14 sm:text-xl">{item.title.split(' ').slice(0, 2).join(' ')}<br />{item.title.split(' ').slice(2).join(' ')}</span><span className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-amber-400 text-amber-950 shadow-lg sm:bottom-3 sm:right-3 sm:h-11 sm:w-11"><Play size={18} fill="currentColor" className="ml-0.5" /></span></>}
              {item.imageSrc ? null : item.grade ? <span className="absolute right-2 top-2 text-3xl font-black leading-none text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.85),0_0_10px_rgba(0,0,0,0.65)] sm:right-3 sm:top-3 sm:text-5xl"><span className="sr-only">Lớp </span>{item.grade}</span> : <span aria-hidden="true" className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black text-white backdrop-blur-sm md:right-4 md:top-4">{String(index + 1).padStart(2, '0')}</span>}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
