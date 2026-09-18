'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Fit the content without changing the animated tile's dimensions. */
export default function FittedTileContent({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  const frame = useRef<HTMLSpanElement>(null)
  const content = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    let disposed = false
    const fit = () => {
      if (disposed || !frame.current || !content.current) return
      setScale(Math.min(1,
        frame.current.clientWidth / Math.max(1, content.current.scrollWidth),
        frame.current.clientHeight / Math.max(1, content.current.scrollHeight)))
    }
    fit()
    const observer = new ResizeObserver(fit)
    if (frame.current) observer.observe(frame.current)
    if (content.current) observer.observe(content.current)
    void document.fonts.ready.then(fit)
    return () => { disposed = true; observer.disconnect() }
  }, [children, wrap])
  return <span ref={frame} style={{ position: 'absolute', inset: 4, overflow: 'hidden' }}>
    <span ref={content} style={{ position: 'absolute', left: '50%', top: '50%', width: wrap ? '100%' : 'max-content',
      textAlign: 'center', whiteSpace: wrap ? 'normal' : 'nowrap', overflowWrap: 'normal', lineHeight: 1.3,
      transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}>{children}</span>
  </span>
}
