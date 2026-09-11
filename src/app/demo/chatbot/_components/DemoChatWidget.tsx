'use client'
import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, X } from 'lucide-react'
import Chat from './Chat'

export default function DemoChatWidget() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = () => { setOpen(false); launcher.current?.focus() }

  useEffect(() => {
    if (!open) return
    const target = panel.current?.querySelector<HTMLElement>('textarea:not(:disabled)') || panel.current?.querySelector<HTMLElement>('button')
    target?.focus({ preventScroll: true })
  }, [open])

  return <>
    <button ref={launcher} type="button" className="demo-chat-launcher" onClick={() => { setMounted(true); setOpen(value => !value) }} aria-label={open ? 'Đóng chatbot demo' : 'Mở chatbot demo'} aria-expanded={open} aria-controls={mounted ? 'demo-chat-widget' : undefined}>
      {open ? <X size={27} /> : <MessageCircle size={28} />}
      <span className="demo-chat-launcher-label">DEMO</span>
    </button>
    {mounted && <div ref={panel} id="demo-chat-widget" role="dialog" aria-label="Aqua · Chatbot demo" className="demo-chat-widget" hidden={!open} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
      <div className="demo-chat-widget-header">
        <span className="demo-chat-widget-avatar"><Bot size={24} /></span>
        <div><strong>Aqua · Chatbot demo</strong><small>Trợ lý quản lý trại nuôi</small></div>
        <button type="button" onClick={close} aria-label="Đóng cửa sổ chat demo"><X size={18} /></button>
      </div>
      <Chat compact />
    </div>}
  </>
}
