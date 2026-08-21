'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, MessageCircle, SendHorizonal, X } from 'lucide-react'
import type { ChatContext } from '@/lib/chat/constants'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const ASK_TAG = '[ASK_CONTACT_INFO]'

function thumbnailFromGamePath(gamePath: string) {
  const slug = gamePath.split('/').filter(Boolean).at(-1)
  if (!slug || slug === 'game') return null
  const assetFolder = slug === 'cong-den-10' ? 'bubble-shooter' : slug
  return `/games/${assetFolder}/images/thumbnail/thumbnail.jpg`
}

function GameThumbnail({ gamePath }: { gamePath: string }) {
  const [available, setAvailable] = useState(true)
  const thumbnail = thumbnailFromGamePath(gamePath)
  if (!thumbnail || !available) return null

  return (
    <a href={gamePath} className="mt-2 block overflow-hidden rounded-xl border border-blue-100 bg-blue-50">
      <Image src={thumbnail} alt="Ảnh minh họa trò chơi" width={240} height={240} unoptimized className="aspect-square h-auto w-full object-cover" onError={() => setAvailable(false)} />
    </a>
  )
}

function MessageContent({ content, showThumbnails }: { content: string; showThumbnails: boolean }) {
  const parts = content.split(/(\/game(?:\/[a-zA-Z0-9-]+)*)/g)
  const gamePaths = Array.from(new Set(content.match(/\/game(?:\/[a-zA-Z0-9-]+)+/g) ?? []))
  return (
    <>
      <p className="whitespace-pre-line">
        {parts.map((part, index) => part.startsWith('/game') ? (
          <a key={`${part}-${index}`} href={part} className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-500">{part}</a>
        ) : part)}
      </p>
      {showThumbnails && gamePaths.map((gamePath) => <GameThumbnail key={gamePath} gamePath={gamePath} />)}
    </>
  )
}

const BOT_CONFIG = {
  game: {
    name: 'Trợ lý Học tập Bé Băng',
    status: 'Sẵn sàng cùng bé học và chơi',
    greeting: 'Xin chào! Mình là Trợ lý Học tập Bé Băng. Bạn muốn hỏi cách chơi game hay cần mình giúp giải thích bài học nào?',
    placeholder: 'Hỏi về game hoặc bài học...',
    button: 'bg-blue-600 hover:bg-blue-500',
    header: 'from-blue-600 to-cyan-500',
    subtle: 'bg-blue-500/10',
    userBubble: 'bg-blue-600',
    focus: 'focus:border-blue-400 focus:ring-blue-300',
    ping: 'bg-blue-500',
  },
  shop: {
    name: 'Trợ lý Shop Bé Băng',
    status: 'Online - sẵn sàng tư vấn',
    greeting: 'Xin chào! Mình là Trợ lý Shop Bé Băng. Mình có thể giúp bạn chọn quần áo, kích cỡ và sản phẩm phù hợp cho bé.',
    placeholder: 'Hỏi về sản phẩm, size, đặt hàng...',
    button: 'bg-pink-600 hover:bg-pink-500',
    header: 'from-pink-600 to-rose-400',
    subtle: 'bg-pink-500/10',
    userBubble: 'bg-pink-600',
    focus: 'focus:border-pink-400 focus:ring-pink-300',
    ping: 'bg-pink-500',
  },
} as const

export default function ChatWidget() {
  const pathname = usePathname()
  const context: ChatContext = pathname === '/game' || pathname.startsWith('/game/') ? 'game' : 'shop'
  const config = BOT_CONFIG[context]
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: config.greeting }])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousContext = useRef(context)

  useEffect(() => {
    if (previousContext.current === context) return
    previousContext.current = context
    setMessages([{ role: 'assistant', content: config.greeting }])
    setInput('')
    setShowLeadForm(false)
  }, [config.greeting, context])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showLeadForm])

  useEffect(() => {
    const sessionKey = `be-bang-${context}-chat-auto-opened`
    if (sessionStorage.getItem(sessionKey)) return
    let scrolled = false
    let elapsed = false

    const maybeOpen = () => {
      if (!scrolled || !elapsed) return
      sessionStorage.setItem(sessionKey, '1')
      setIsOpen(true)
      window.removeEventListener('scroll', checkScroll)
    }
    const checkScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrolled = max <= 0 || window.scrollY / max >= 0.25
      maybeOpen()
    }
    const timer = window.setTimeout(() => { elapsed = true; maybeOpen() }, 15_000)
    window.addEventListener('scroll', checkScroll, { passive: true })
    checkScroll()
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', checkScroll) }
  }, [context])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || isSending) return
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setIsSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Không thể kết nối chatbot.')
      const rawReply = String(data.reply ?? '')
      setMessages((current) => [...current, { role: 'assistant', content: rawReply.replace(ASK_TAG, '').trim() }])
      if (context === 'shop' && rawReply.includes(ASK_TAG)) setShowLeadForm(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kết nối có lỗi, bạn thử gửi lại giúp mình nhé.'
      setMessages((current) => [...current, { role: 'assistant', content: message }])
    } finally {
      setIsSending(false)
    }
  }

  const submitMessage = (event: FormEvent) => { event.preventDefault(); void handleSend() }
  const submitLead = (event: FormEvent) => {
    event.preventDefault()
    alert('Cảm ơn bạn! Shop Bé Băng sẽ liên hệ với bạn sớm nhất.')
    setName(''); setPhone(''); setNote(''); setShowLeadForm(false)
  }

  return (
    <>
      <button onClick={() => setIsOpen((value) => !value)} className={`fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-105 ${config.button}`} aria-label={`Mở ${config.name}`}>
        <MessageCircle className="h-7 w-7" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div key={context} initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.9 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="fixed bottom-20 right-4 z-50 flex w-80 max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className={`flex items-center justify-between bg-gradient-to-r px-3 py-2 text-white ${config.header}`}>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20"><Bot className="h-6 w-6" /></div>
                <div className="flex flex-col"><span className="text-sm font-semibold">{config.name}</span><span className="text-[11px] text-white/80">{config.status}</span></div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-white/10" aria-label="Đóng chat"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex max-h-96 flex-col bg-slate-50">
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
                {messages.map((message, index) => {
                  const isUser = message.role === 'user'
                  return (
                    <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && <div className={`mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.subtle}`}><Bot className="h-4 w-4 text-slate-600" /></div>}
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${isUser ? `rounded-br-sm text-white ${config.userBubble}` : 'rounded-tl-sm bg-white text-slate-900'}`}><MessageContent content={message.content} showThumbnails={!isUser && context === 'game'} /></div>
                    </div>
                  )
                })}
                {isSending && <div className="flex items-center gap-2 text-xs text-slate-400"><span className={`h-2 w-2 animate-ping rounded-full ${config.ping}`} />{config.name} đang trả lời.</div>}

                {context === 'shop' && showLeadForm && (
                  <form onSubmit={submitLead} className="space-y-2 rounded-xl border border-pink-100 bg-white p-3 text-xs shadow-sm">
                    <p className="text-slate-600">Để shop hỗ trợ tốt hơn, bạn để lại tên và số điện thoại nhé.</p>
                    <input required value={name} onChange={(event) => setName(event.target.value)} className={`h-8 w-full rounded-lg border border-slate-300 px-2 outline-none focus:ring-1 ${config.focus}`} placeholder="Tên của bạn" />
                    <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={`h-8 w-full rounded-lg border border-slate-300 px-2 outline-none focus:ring-1 ${config.focus}`} placeholder="Số điện thoại" />
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} className={`min-h-12 w-full rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-1 ${config.focus}`} placeholder="Nhu cầu cần tư vấn (không bắt buộc)" />
                    <button type="submit" className={`w-full rounded-xl px-3 py-2 font-semibold text-white ${config.button}`}>Gửi thông tin cho Shop Bé Băng</button>
                  </form>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={submitMessage} className="flex items-center gap-2 border-t border-slate-200 bg-white px-2 py-2">
                <input value={input} onChange={(event) => setInput(event.target.value)} className={`h-9 flex-1 rounded-full border border-slate-300 px-3 text-sm outline-none focus:ring-1 ${config.focus}`} placeholder={config.placeholder} />
                <button type="submit" disabled={isSending || !input.trim()} className={`flex h-9 w-9 items-center justify-center rounded-full text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${config.button}`} aria-label="Gửi tin nhắn"><SendHorizonal className="h-4 w-4" /></button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
