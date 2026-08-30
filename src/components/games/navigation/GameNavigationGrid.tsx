import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type GameNavigationItem = { title: string; href: string }
export type GameBreadcrumb = { label: string; href?: string }

type Props = {
  title?: string
  description?: string
  items: readonly GameNavigationItem[]
  breadcrumbs: readonly GameBreadcrumb[]
}

export default function GameNavigationGrid({ title, description, items, breadcrumbs }: Props) {
  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-to-b from-sky-50 to-pink-50 px-4 py-7 md:px-6 md:py-10">
      <section className="relative mx-auto max-w-6xl">
        <nav aria-label="Điều hướng trò chơi" className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm font-bold text-slate-500">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="contents">
              {index > 0 && <ChevronRight size={15} aria-hidden="true" />}
              {item.href ? (
                <Link href={item.href} className="text-blue-700 hover:text-blue-800">{item.label}</Link>
              ) : (
                <span className="text-slate-800" aria-current="page">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {(title || description) && <div className="mt-5 md:mt-7">
          {title && <h1 className="text-2xl font-black text-slate-800 md:text-4xl">{title}</h1>}
          {description && <p className="mt-2 font-semibold text-slate-500">{description}</p>}
        </div>}

        <div className="mt-5 grid grid-cols-2 gap-3 md:mt-7 md:gap-5 lg:grid-cols-4">
          {items.map((item, index) => (
            <Link key={item.href} href={item.href} className="group relative aspect-square overflow-hidden rounded-2xl border-[3px] border-white bg-gradient-to-br from-sky-400 via-blue-500 to-violet-600 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 md:rounded-[2rem]">
              <div className="absolute inset-0 opacity-25" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle at 25% 22%, white 0 3px, transparent 4px), radial-gradient(circle at 75% 35%, white 0 5px, transparent 6px)' }} />
              <div className="absolute inset-0 grid place-items-center p-4 text-center">
                <span className="text-2xl font-black text-white drop-shadow-md md:text-4xl">{item.title}</span>
              </div>
              <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black text-white backdrop-blur-sm md:right-4 md:top-4">{String(index + 1).padStart(2, '0')}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
