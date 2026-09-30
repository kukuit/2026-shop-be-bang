'use client'

import Image from 'next/image'
import styles from './GameRewardToast.module.css'

export default function GameRewardToast({ amount }: { amount: number }) {
  if (amount <= 0) return null
  return (
    <div className={`${styles.toast} pointer-events-none absolute left-1/2 top-1/3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-amber-300 px-6 py-3 text-3xl font-black text-amber-950 shadow-xl`}>
      <span>+{amount}</span>
      <Image src="/games/general/images/optimize/xu_icon.png" alt="xu" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
    </div>
  )
}
