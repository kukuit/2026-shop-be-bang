'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { Gift, Pencil, Plus, RefreshCw, X } from 'lucide-react'

type Reward = { id: string; name: string; coinCost: number; imageUrl: string | null; isActive: boolean; order: number }
const assets = [
  ['/games/general/images/gifts/thach-zai-zai.webp', 'Thạch Zai Zai'], ['/games/general/images/gifts/rong-bien.webp', 'Rong biển'], ['/games/general/images/gifts/sua-fristi.webp', 'Sữa Fristi'], ['/games/general/images/gifts/snack.webp', 'Snack'], ['/games/general/images/gifts/keo-deo.webp', 'Kẹo dẻo'], ['/games/general/images/gifts/banh-trang-tron.webp', 'Bánh tráng trộn'], ['/games/general/images/gifts/xuc-xich.webp', 'Xúc xích'],
]

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Reward | null>(null), [name, setName] = useState(''), [coinCost, setCoinCost] = useState(''), [imageUrl, setImageUrl] = useState<string | null>(null), [isActive, setIsActive] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/game/rewards', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error('Không thể tải danh sách quà.')
      setRewards(data.rewards)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu đổi quà.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const resetForm = () => { setEditing(null); setName(''); setCoinCost(''); setImageUrl(null); setIsActive(true); setFormOpen(false) }
  const addReward = () => { setEditing(null); setName(''); setCoinCost(''); setImageUrl(null); setIsActive(true); setFormOpen(true) }
  const editReward = (reward: Reward) => { setEditing(reward); setName(reward.name); setCoinCost(String(reward.coinCost)); setImageUrl(reward.imageUrl); setIsActive(reward.isActive); setFormOpen(true) }
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch('/api/game/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing?.id, name, coinCost: Number(coinCost), imageUrl, isActive }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Không thể lưu quà.')
      resetForm(); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu quà.') } finally { setSaving(false) }
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">Danh sách quà</h1><p className="mt-2 text-sm text-slate-500">Quản lý những món quà bé có thể đổi bằng xu.</p></div><div className="flex gap-2"><button type="button" onClick={addReward} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-black text-white shadow-sm hover:bg-blue-700"><Plus size={18} /> Thêm quà</button><button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Làm mới danh sách" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-blue-700 disabled:opacity-50"><RefreshCw size={16} /></button></div></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
    <section aria-labelledby="rewards-heading" className="space-y-4">
      {loading ? <p className="rounded-2xl bg-white p-6 text-slate-500">Đang tải quà…</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rewards.map(reward => <article key={reward.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex h-36 items-center justify-center bg-amber-50 p-3">{reward.imageUrl ? <Image src={reward.imageUrl} alt="" width={120} height={120} className="h-28 w-28 object-contain" /> : <Gift className="text-amber-400" size={56} />}</div><div className="p-4"><h3 className="font-black text-slate-800">{reward.name}</h3><p className="mt-1 font-bold text-amber-600">{reward.coinCost} xu</p><p className={`mt-2 text-sm font-bold ${reward.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{reward.isActive ? 'Đang hiển thị' : 'Đang ẩn'}</p><button type="button" onClick={() => editReward(reward)} className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"><Pencil size={15} /> Sửa</button></div></article>)}{!rewards.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 sm:col-span-2 lg:col-span-3">Chưa có quà. Nhấn “Thêm quà” để bắt đầu.</p>}</div>}
    </section>
    {formOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="reward-form-title"><section className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border-4 border-amber-200 bg-white p-5 shadow-2xl sm:p-7"><button type="button" onClick={resetForm} className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng popup"><X /></button><h2 id="reward-form-title" className="flex items-center gap-2 pr-10 text-xl font-black text-slate-800">{editing ? <Pencil size={19} /> : <Plus size={20} />}{editing ? 'Sửa quà' : 'Thêm quà'}</h2><form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-700">Tên quà<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-bold text-slate-700">Số xu<input required type="number" min="1" step="1" value={coinCost} onChange={event => setCoinCost(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
      <fieldset className="md:col-span-2"><legend className="text-sm font-bold text-slate-700">Ảnh quà</legend><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">{assets.map(([url, label]) => <button key={url} type="button" aria-pressed={imageUrl === url} onClick={() => setImageUrl(imageUrl === url ? null : url)} className={`rounded-xl border p-2 text-center text-xs font-semibold ${imageUrl === url ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}><Image src={url} alt="" width={56} height={56} className="mx-auto h-14 w-14 object-contain" /><span className="mt-1 block">{label}</span></button>)}</div></fieldset>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2"><input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} className="h-4 w-4 accent-blue-600" /> Hiển thị cho bé</label><div className="flex gap-2 md:col-span-2"><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-black text-white disabled:opacity-50">{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm quà'}</button>{editing && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600">Hủy sửa</button>}</div>
    </form></section></div>}
  </div>
}
