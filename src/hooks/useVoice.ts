'use client'

import { useEffect, useRef, useState } from 'react'

type Recognition = {
  lang: string
  interimResults: boolean
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function recognitionConstructor() {
  const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return browser.SpeechRecognition || browser.webkitSpeechRecognition
}

export function useVoice(onText: (text: string) => void, onError: (text: string) => void, enabled = true) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const instance = useRef<Recognition | null>(null)
  const callbacks = useRef({ onText, onError })
  callbacks.current = { onText, onError }

  useEffect(() => {
    setSupported(Boolean(recognitionConstructor()))
    if (!enabled) setListening(false)
    return () => {
      const recognition = instance.current
      instance.current = null
      if (recognition) {
        recognition.onresult = recognition.onerror = recognition.onend = null
        recognition.abort()
      }
    }
  }, [enabled])

  const toggle = () => {
    if (instance.current) { instance.current.stop(); return }
    const Constructor = recognitionConstructor()
    if (!enabled || !Constructor) return
    const recognition = new Constructor()
    instance.current = recognition
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.onresult = event => {
      if (instance.current === recognition) callbacks.current.onText(event.results[0][0].transcript)
    }
    recognition.onerror = event => {
      if (instance.current !== recognition) return
      setListening(false)
      if (event.error !== 'aborted') callbacks.current.onError(event.error === 'not-allowed' ? 'Chưa được cấp quyền microphone.' : 'Không nhận được giọng nói. Vui lòng thử lại.')
    }
    recognition.onend = () => {
      if (instance.current !== recognition) return
      instance.current = null
      setListening(false)
    }
    try { recognition.start(); setListening(true) }
    catch {
      instance.current = null
      setListening(false)
      callbacks.current.onError('Không thể bật microphone.')
    }
  }

  return { supported, listening, toggle }
}
