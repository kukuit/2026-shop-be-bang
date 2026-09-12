'use client'
import { useEffect, useRef, useState } from 'react'
type Recognition = { lang: string; interimResults: boolean; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void }
export function useVoice(onText: (text: string) => void, onError: (text: string) => void) {
  const [supported, setSupported] = useState(false); const [listening, setListening] = useState(false); const instance = useRef<Recognition | null>(null)
  useEffect(() => { const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }; setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)); return () => instance.current?.abort() }, [])
  const toggle = () => {
    if (listening) { instance.current?.stop(); return }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }; const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Constructor) return
    const r = new Constructor(); instance.current = r; r.lang = 'vi-VN'; r.interimResults = false
    r.onresult = e => onText(e.results[0][0].transcript)
    r.onerror = e => { setListening(false); onError(e.error === 'not-allowed' ? 'Chưa được cấp quyền microphone.' : 'Không nhận được giọng nói. Vui lòng thử lại.') }
    r.onend = () => setListening(false)
    try { r.start(); setListening(true) } catch { onError('Không thể bật microphone.') }
  }
  return { supported, listening, toggle }
}
