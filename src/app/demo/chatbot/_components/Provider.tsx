'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Dataset, emptyDataset, formatDate } from '../_lib/model'
export async function api(body: unknown, path = 'data') {
  const response = await fetch(`/demo/chatbot/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Thao tác thất bại'); return data
}
const Context = createContext<{ data: Dataset; loading: boolean; error: string; refresh: () => Promise<void>; notify: (text: string) => void; chatBusy: boolean; runChatOperation: (operation: () => Promise<void>) => Promise<void> }>({ data: emptyDataset(), loading: true, error: '', refresh: async () => {}, notify: () => {}, chatBusy: false, runChatOperation: async () => {} })
export const useDemo = () => useContext(Context)
export default function Provider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(emptyDataset); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [toast, setToast] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const chatLock = useRef(false)
  const runChatOperation = useCallback(async (operation: () => Promise<void>) => {
    if (chatLock.current) throw new Error('Vui l?ng ch? thao t?c chat hi?n t?i ho?n t?t.')
    chatLock.current = true
    setChatBusy(true)
    try { await operation() } finally { chatLock.current = false; setChatBusy(false) }
  }, [])
  const refresh = useCallback(async () => { try { const response = await fetch('/demo/chatbot/api/data', { cache: 'no-store' }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu') } finally { setLoading(false) } }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer) }, [toast])
  const reminders = data.reminders.filter(r => r.status === 'pending' && String(r.remindAt) <= new Date().toISOString())
  return <Context.Provider value={{ data, loading, error, refresh, notify: setToast, chatBusy, runChatOperation }}>{error && <div role="alert" className="demo-alert">{error} <button onClick={refresh}>Thử lại</button></div>}{reminders.length > 0 && <details className="demo-alert"><summary>Nhắc việc: {reminders.length} công việc đã đến giờ</summary>{reminders.map(r => <p key={r.id}>{r.title} · {formatDate(r.remindAt)}</p>)}</details>}{children}{toast && <div role="status" className="demo-toast">{toast}</div>}</Context.Provider>
}
