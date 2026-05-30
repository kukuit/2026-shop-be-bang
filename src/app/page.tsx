import Image from 'next/image'
import Link from 'next/link'
import {
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  WalletCards,
} from 'lucide-react'

const products = [
  {
    name: 'Đầm Bé Gái Hoa Nhí',
    price: '189.000đ',
    image: '/images/products/product-0001.webp',
  },
  {
    name: 'Set Áo Thun Dễ Thương',
    price: '159.000đ',
    image: '/images/products/product-0002.webp',
  },
  {
    name: 'Bộ Đi Chơi Mùa Hè',
    price: '219.000đ',
    image: '/images/products/product-0003.webp',
  },
  {
    name: 'Váy Công Chúa Bé Băng',
    price: '249.000đ',
    image: '/images/products/product-0004.webp',
  },
]

const categories = ['Bé gái', 'Bé trai', 'Sơ sinh', 'Đồ bộ', 'Phụ kiện']

export default function HomePage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="shop-topbar">
        <div className="shop-container flex items-center justify-between gap-4 text-[11px] font-medium">
          <span>Welcome to Shop Bé Băng</span>
          <span className="hidden sm:inline">Hotline: 0923 456 789</span>
          <span>Register / Login</span>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white">
        <div className="shop-container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black uppercase tracking-wide text-[var(--shop-primary)]">
            Bé Băng
          </Link>

          <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-wide md:flex">
            {['Home', 'Shop', 'Pages', 'Blog', 'Contact'].map((item) => (
              <Link
                key={item}
                href={item === 'Home' ? '/' : '#'}
                className={
                  item === 'Home'
                    ? 'text-[var(--shop-primary)]'
                    : 'text-slate-700 hover:text-[var(--shop-primary)]'
                }
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-slate-700">
            <Search className="h-4 w-4" />
            <Heart className="h-4 w-4" />
            <ShoppingBag className="h-4 w-4" />
            <Menu className="h-5 w-5 md:hidden" />
          </div>
        </div>
      </section>

      <section className="shop-hero">
        <div className="shop-container grid min-h-[430px] items-center gap-8 py-10 md:grid-cols-[0.9fr_1.1fr] md:py-14">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--shop-primary)]">
              New season for little stars
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              Quần áo trẻ em mềm xinh, dễ mặc mỗi ngày
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              Shop Bé Băng chọn các mẫu váy, set đồ và phụ kiện đáng yêu cho bé từ sơ sinh đến 8
              tuổi, ưu tiên chất liệu thoáng mát và form mặc thoải mái.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#products" className="shop-button">
                Shop now
              </Link>
              <Link href="#collections" className="shop-button-outline">
                Xem bộ sưu tập
              </Link>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            <div className="shop-hero-card col-span-2 aspect-[16/10] md:col-span-1 md:aspect-[4/5]">
              <Image
                src="/images/products/product-0001.webp"
                alt="Đầm trẻ em Shop Bé Băng"
                fill
                priority
                className="object-contain p-6"
                sizes="(max-width: 768px) 100vw, 360px"
              />
            </div>
            <div className="grid gap-4">
              <div className="shop-hero-card aspect-square">
                <Image
                  src="/images/products/product-0002.webp"
                  alt="Set áo thun trẻ em"
                  fill
                  className="object-contain p-5"
                  sizes="180px"
                />
              </div>
              <div className="shop-sale-badge">
                <span>35%</span>
                <small>OFF</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="collections" className="shop-container py-7">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="shop-promo bg-[#dff5ff]">
            <div>
              <p>New Arrival</p>
              <h2>Baby dress get 30% off</h2>
              <Link href="#products">Shop now</Link>
            </div>
            <Image
              src="/images/products/product-0003.webp"
              alt="New arrival"
              width={190}
              height={190}
              className="object-contain"
            />
          </article>
          <article className="shop-promo bg-[#ffe1ec]">
            <div>
              <p>New Style</p>
              <h2>Set đồ xinh cho bé</h2>
              <Link href="#products">Shop now</Link>
            </div>
            <Image
              src="/images/products/product-0002.webp"
              alt="Set đồ trẻ em"
              width={180}
              height={180}
              className="object-contain"
            />
          </article>
          <article className="shop-promo bg-[#dff5ff]">
            <div>
              <p>Trendy</p>
              <h2>Collections mới về</h2>
              <Link href="#products">Shop now</Link>
            </div>
            <Image
              src="/images/products/product-0004.webp"
              alt="Collection trẻ em"
              width={185}
              height={185}
              className="object-contain"
            />
          </article>
        </div>
      </section>

      <section id="products" className="shop-container py-10 md:py-14">
        <div className="text-center">
          <h2 className="text-2xl font-black">Popular Products</h2>
          <p className="mt-1 text-sm text-slate-500">Những mẫu được mẹ chọn nhiều nhất tuần này</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button key={category} className="shop-chip" type="button">
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article key={product.name} className="shop-product-card">
              <div className="relative aspect-square bg-[#f4fbff]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 768px) 50vw, 260px"
                />
              </div>
              <div className="pt-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">{product.name}</h3>
                  <span className="text-sm font-bold text-[var(--shop-primary)]">
                    {product.price}
                  </span>
                </div>
                <div className="mt-2 flex gap-0.5 text-[#8ed3ee]" aria-label="5 stars">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3">
        <article className="shop-wide-promo bg-[#92d7f2]">
          <Image
            src="/images/products/product-0002.webp"
            alt="New arrivals"
            width={260}
            height={220}
            className="object-contain"
          />
          <div>
            <p>New Arrivals</p>
            <h2>Up to 35% off</h2>
            <Link href="#products">Shop now</Link>
          </div>
        </article>
        <article className="shop-wide-promo bg-[#7fc9eb]">
          <div>
            <p>Online Shopping</p>
            <h2>Flat 25% off</h2>
            <Link href="#products">Shop now</Link>
          </div>
          <Image
            src="/images/products/product-0003.webp"
            alt="Online shopping"
            width={260}
            height={220}
            className="object-contain"
          />
        </article>
        <article className="shop-wide-promo bg-[#a9ddf5]">
          <div>
            <p>Baby Girl&apos;s</p>
            <h2>Collection mới</h2>
            <Link href="#products">Shop now</Link>
          </div>
          <Image
            src="/images/products/product-0004.webp"
            alt="Baby girls collection"
            width={250}
            height={220}
            className="object-contain"
          />
        </article>
      </section>

      <section className="shop-container grid gap-10 py-12 md:grid-cols-[0.9fr_1.1fr] md:py-16">
        <article className="shop-deal">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--shop-primary)]">
            Best Deal
          </p>
          <h2 className="mt-2 text-2xl font-black">Combo bé đi chơi cuối tuần</h2>
          <Image
            src="/images/products/product-0001.webp"
            alt="Best deal"
            width={320}
            height={320}
            className="mx-auto mt-3 object-contain"
          />
          <div className="mt-4 flex justify-center gap-4 text-center text-xs font-semibold text-slate-500">
            {['307 Days', '22 Hours', '29 Mins', '54 Secs'].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </div>
          <Link href="#products" className="shop-button mt-5">
            Shop now
          </Link>
        </article>

        <div>
          <h2 className="text-2xl font-black">On Sale Products</h2>
          <p className="mt-1 text-sm text-slate-500">Một số mẫu đang ưu đãi trong tháng</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <article key={`sale-${product.name}`} className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0 bg-[#f4fbff]">
                  <Image src={product.image} alt={product.name} fill className="object-contain p-3" sizes="96px" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{product.name}</h3>
                  <p className="mt-1 text-sm font-bold text-[var(--shop-primary)]">
                    {product.price}
                  </p>
                  <div className="mt-1 flex gap-0.5 text-[#8ed3ee]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shop-service-strip">
        <div className="shop-container grid gap-6 py-8 text-center md:grid-cols-3">
          {[
            { icon: Truck, title: 'Free Shipping', text: 'Cho đơn từ 500.000đ' },
            { icon: WalletCards, title: 'Money Back Guarantee', text: 'Đổi trả trong 7 ngày' },
            { icon: ShieldCheck, title: 'Secure Payment', text: 'Thanh toán an toàn' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title}>
                <Icon className="mx-auto h-8 w-8 text-slate-800" />
                <h3 className="mt-2 text-sm font-black">{item.title}</h3>
                <p className="text-xs text-slate-600">{item.text}</p>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
