import HeroSection from '@/components/home/HeroSection'
import KidsLearningSection from '@/components/home/KidsLearningSection'
import NewArrivalsSection from '@/components/home/NewArrivalsSection'
import SaleSection from '@/components/home/SaleSection'

export default function HomePage() {
  return (
    <main className="!bg-[#fffcfa] text-zinc-900">
      <HeroSection />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <KidsLearningSection />
        <NewArrivalsSection />
        <SaleSection />
      </div>
    </main>
  )
}
