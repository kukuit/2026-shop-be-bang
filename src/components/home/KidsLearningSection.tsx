import Image from 'next/image'
import Link from 'next/link'

const learningCards = [
  {
    title: 'Game cho bé học tập',
    subtitle: 'Toán, Tiếng Việt, Tiếng Anh',
    description: 'Học xong một bài, chơi ngay một game để bé ôn lại kiến thức.',
    action: 'Chơi ngay',
    href: '/game',
    image: '/games/lessons/lop-1/images/optimize/toan-square.png',
    alt: 'Cappy cùng bé khám phá các con số',
    tone: 'bg-[#eaf6ff]',
    overlay: 'from-[#eaf6ff] via-[#eaf6ff]/75 to-transparent',
    cta: 'text-sky-700',
  },
  {
    title: 'Thi thử Trạng Nguyên',
    subtitle: 'Tiếng Việt lớp 1',
    description: 'Làm bài trực tiếp trên máy tính và điện thoại.',
    action: 'Thi thử ngay',
    href: '/game/lop-1/tieng-viet/trang-nguyen/thi-thu',
    image: '/games/lessons/lop-1/images/optimize/tieng-viet-square.png',
    alt: 'Cappy cùng bé học Tiếng Việt',
    tone: 'bg-[#fff5e8]',
    overlay: 'from-[#fff5e8] via-[#fff5e8]/75 to-transparent',
    cta: 'text-amber-700',
  },
]

export default function KidsLearningSection() {
  return (
    <section id="kids-learning" className="scroll-mt-20 py-6 md:py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
          Bé học & chơi
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Vừa học vừa chơi, giúp bé học tập thú vị hơn mỗi ngày.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
        {learningCards.map((card) => (
          <article
            key={card.href}
            className={`relative isolate flex min-h-[260px] overflow-hidden rounded-3xl ${card.tone}`}
          >
            <div className="relative z-10 flex w-[62%] flex-col items-start justify-center p-6 sm:p-8">
              <h3 className="text-xl font-bold leading-tight text-zinc-900 sm:text-2xl">
                {card.title}
              </h3>
              <p className="mt-2 text-sm font-semibold text-zinc-700">{card.subtitle}</p>
              <p className="mt-2 max-w-[22rem] text-sm leading-6 text-zinc-600">
                {card.description}
              </p>
              <Link
                href={card.href}
                className={`mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-white/90 px-5 text-sm font-semibold shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${card.cta}`}
              >
                {card.action}{' '}
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
            <div className="absolute inset-y-0 right-0 w-[54%]">
              <Image
                src={card.image}
                alt={card.alt}
                fill
                loading="lazy"
                sizes="(max-width: 767px) 54vw, 280px"
                className="object-cover object-center"
              />
              <div
                className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r ${card.overlay}`}
                aria-hidden="true"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
