import Image from 'next/image'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="bg-[#fff6f1]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-6 px-4 py-6 sm:px-6 md:grid-cols-2 md:gap-8 md:py-8 lg:px-8 lg:py-10">
        <div className="order-last max-w-xl md:order-first">
          <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl lg:text-[56px]">
            Mặc đẹp mỗi ngày
            <span className="block text-rose-500">Vui học mỗi ngày</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-zinc-600">
            Thời trang xinh xắn cho bé, đồng hành cùng những ngày học tập và khám phá thế giới.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="#new-arrivals"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose-500 px-6 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-md active:translate-y-0 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Xem hàng mới{' '}
            </Link>
            <Link
              href="#sale"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-300 bg-white/60 px-6 text-sm font-semibold text-rose-600 transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Săn sale
            </Link>
          </div>
        </div>

        <div className="relative order-first mx-auto w-full max-w-md md:order-last md:ml-auto">
          {/* TODO: replace with a final lifestyle hero image when one is available. */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-rose-100">
            <Image
              src="/images/products/product-0001.webp"
              alt="Bộ quần áo hồng xinh cho bé"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 520px"
              className="object-cover"
            />
          </div>
          <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm sm:bottom-5 sm:left-5 sm:text-sm">
            Mềm mại, thoải mái mỗi ngày
          </div>
        </div>
      </div>
    </section>
  )
}
