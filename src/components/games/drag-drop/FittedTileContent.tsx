'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Fit the content without changing the animated tile's dimensions. */
export default function FittedTileContent({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLSpanElement>(null)
  const content = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => {
      if (!frame.current || !content.current) return
      setScale(Math.min(1,
        frame.current.clientWidth / Math.max(1, content.current.scrollWidth),
        frame.current.clientHeight / Math.max(1, content.current.scrollHeight)))
    }
    fit()
    const observer = new ResizeObserver(fit)
    if (frame.current) observer.observe(frame.current)
    if (content.current) observer.observe(content.current)
    return () => observer.disconnect()
  }, [children])
  return <span ref={frame} style={{ position: 'absolute', inset: 2, overflow: 'hidden' }}>
    <span ref={content} style={{ position: 'absolute', left: '50%', top: '50%', width: '100%',
      textAlign: 'center', overflowWrap: 'anywhere', lineHeight: 1.15,
      transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}>{children}</span>
  </span>
}
