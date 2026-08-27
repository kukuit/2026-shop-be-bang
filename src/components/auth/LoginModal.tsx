'use client'
import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from './AuthProvider'

export default function LoginModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const { login } = useAuth(); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  useEffect(() => { if (!open) { setPassword(''); setError('') } }, [open])
  if (!open) return null
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setSubmitting(true); try { await login(username, password); onClose() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Đăng nhập thất bại.') } finally { setSubmitting(false) } }
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between"><h2 id="login-title" className="text-xl font-black text-slate-900">Đăng nhập</h2><button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></div>
      <label className="mt-6 block text-sm font-bold text-slate-700">Tên đăng nhập<input autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100" required /></label>
      <label className="mt-4 block text-sm font-bold text-slate-700">Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100" required /></label>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <button disabled={submitting} className="mt-6 w-full rounded-xl bg-pink-500 px-4 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">{submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  </div>
}
