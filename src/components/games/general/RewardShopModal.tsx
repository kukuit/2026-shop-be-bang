'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Gift, LoaderCircle, X } from 'lucide-react'

type Reward = { id: string; name: string; coinCost: number; imageUrl: string | null; isActive: boolean; order: number }
type WonGift = { name: string; imageUrl: string | null }

function RewardImage({ src, size, className = '' }: { src: string | null; size: number; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    {(!src || failed) && <Gift className="text-slate-300" size={Math.round(size * 0.48)} />}
    {src && !failed && <>
      {!loaded && <LoaderCircle className="absolute text-slate-300 animate-spin" size={Math.round(size * 0.28)} />}
      <Image src={src} alt="" width={size} height={size} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
    </>}
  </div>
}

export default function RewardShopModal({ open, onClose, coinBalance, onBalanceChange, onSuccess }: { open: boolean; onClose: () => void; coinBalance: number; onBalanceChange: (balance: number) => void; onSuccess: (gift: WonGift) => void }) {
  const [rewards, setRewards] = useState<Reward[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState(''), [selected, setSelected] = useState<Reward | null>(null), [redeeming, setRedeeming] = useState(false)
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true); setError('')
    fetch('/api/game/rewards', { cache: 'no-store' }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách quà.')
      if (active) { setRewards(data.rewards.filter((reward: Reward) => reward.isActive).sort((a: Reward, b: Reward) => a.coinCost - b.coinCost || a.order - b.order)); onBalanceChange(data.coinBalance ?? 0) }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách quà.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open])
  const redeem = async () => {
    if (!selected || redeeming) return
    setRedeeming(true); setError('')
    try {
      const response = await fetch('/api/game/rewards/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rewardId: selected.id }) })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 409) {
          if (typeof data.coinBalance === 'number') onBalanceChange(data.coinBalance)
          throw new Error(data.message === 'INSUFFICIENT_BALANCE' ? 'Bé chưa đủ xu cho món quà này.' : 'Món quà này hiện không còn đổi được.')
        }
        throw new Error('Chưa đổi được quà. Bé thử lại nhé!')
      }
      onBalanceChange(data.coinBalance); const gift = { name: data.rewardName, imageUrl: data.rewardImageUrl }; setSelected(null); onClose(); onSuccess(gift)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa đổi được quà. Bé thử lại nhé!') } finally { setRedeeming(false) }
  }
  if (!open) return null
  return <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="reward-popup-title">
    <div className="relative flex max-h-[78dvh] w-[94%] max-w-md flex-col overflow-hidden rounded-[2rem] border-4 border-amber-300 bg-white p-4 shadow-2xl sm:p-6">
      <button type="button" onClick={() => { setSelected(null); onClose() }} className="absolute right-3 top-3 z-10 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng hộp quà"><X /></button>
      <h2 id="reward-popup-title" className="pr-10 text-center text-2xl font-black text-blue-600">Quà của bé</h2>
      <p className="mt-1 flex items-center justify-center gap-1.5 font-bold text-slate-700"><span>Hiện có:</span><span className="text-2xl font-black text-amber-500">{coinBalance}</span><Image src="/games/general/images/optimize/xu_icon.png" alt="xu" width={24} height={24} className="h-6 w-6" /></p>
      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {loading && <div className="space-y-3" role="status" aria-label="Đang tải danh sách quà">{[0, 1, 2].map(item => <div key={item} className="flex h-20 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3"><div className="reward-shimmer h-[68px] w-[68px] shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><div className="reward-shimmer h-3 w-3/5 rounded-full" /><div className="reward-shimmer h-3 w-1/3 rounded-full" /></div><div className="reward-shimmer h-10 w-10 shrink-0 rounded-xl" /></div>)}</div>}
        {!loading && !error && rewards.length === 0 && <div className="rounded-2xl bg-amber-50 p-5 text-center"><p className="text-3xl">🎁</p><p className="mt-2 font-black text-blue-700">Chưa có quà nào</p><p className="mt-1 text-sm text-slate-600">Ba/mẹ chưa cài quà cho bé. Hãy tiếp tục chơi và tích xu nhé!</p></div>}
        {!loading && rewards.map(reward => {
          const shortfall = Math.max(0, reward.coinCost - coinBalance)
          return <article key={reward.id} className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
            <RewardImage src={reward.imageUrl} size={68} />
            <div className="min-w-0 flex-1"><h3 className="truncate font-black text-slate-800">{reward.name}</h3><p className="mt-1 flex items-center gap-1 font-bold text-amber-600">{reward.coinCost}<Image src="/games/general/images/optimize/xu_icon.png" alt="xu" width={18} height={18} className="h-[18px] w-[18px]" /></p>
              {shortfall > 0 && <><p className="mt-1 text-xs font-bold text-slate-500">Còn thiếu {shortfall} xu</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, coinBalance / reward.coinCost * 100)}%` }} /></div></>}
            </div>
            <button type="button" disabled={shortfall > 0} onClick={() => setSelected(reward)} aria-label={shortfall > 0 ? `Chưa đủ xu để đổi ${reward.name}` : `Nhận ${reward.name}`} title={shortfall > 0 ? `Còn thiếu ${shortfall} xu` : `Nhận ${reward.name}`} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-sm transition ${shortfall > 0 ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'}`}><Gift size={21} aria-hidden="true" /></button>
          </article>
        })}
      </div>
      {error && <p role="alert" className="mt-3 text-center text-sm font-bold text-rose-600">{error}</p>}
    </div>
    {selected && <div className="absolute inset-0 z-[60] grid place-items-center bg-slate-950/55 p-5" role="alertdialog" aria-modal="true" aria-labelledby="reward-confirm-title">
      <div className="w-full max-w-xs rounded-[2rem] border-4 border-amber-300 bg-white p-5 text-center shadow-2xl"><h3 id="reward-confirm-title" className="text-xl font-black text-blue-700">Đổi quà này nhé?</h3>
        <div className="mx-auto mt-3"><RewardImage src={selected.imageUrl} size={88} /></div><p className="mt-2 font-black text-slate-800">{selected.name}</p><p className="mt-1 font-bold text-amber-600">{selected.coinCost} xu</p><p className="mt-3 text-sm text-slate-600">Bé đang có: <b>{coinBalance} xu</b></p><p className="text-sm text-slate-600">Đổi xong còn: <b>{coinBalance - selected.coinCost} xu</b></p>
        <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={redeeming} onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-600 disabled:opacity-50">Để sau</button><button type="button" disabled={redeeming} onClick={() => void redeem()} className="rounded-xl bg-emerald-500 px-3 py-2 font-black text-white disabled:opacity-60">{redeeming ? 'Đang đổi...' : 'Đổi quà 🎁'}</button></div>
      </div>
    </div>}
    <style jsx>{`@keyframes reward-shimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } } .reward-shimmer { background: linear-gradient(100deg, #f1f5f9 25%, #e2e8f0 40%, #f1f5f9 55%); background-size: 220% 100%; animation: reward-shimmer 1.6s ease-in-out infinite } @media (prefers-reduced-motion: reduce) { .reward-shimmer { animation: none } }`}</style>
  </div>
}
