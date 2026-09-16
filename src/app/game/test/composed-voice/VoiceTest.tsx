'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Square, Volume2 } from 'lucide-react'
import { QuestionVoicePlayer } from '@/components/games/general/QuestionVoicePlayer'
import { ComposedAudioPlayer, type SegmentMeasurement } from '@/components/games/general/composed-audio'
import { GAME_NAMES, generateVoiceSamples, type VoiceSample } from './samples'

export default function VoiceTest() {
  const playerRef = useRef<QuestionVoicePlayer | null>(null)
  const composedRef = useRef<ComposedAudioPlayer | null>(null)
  const requestRef = useRef(0)
  const [mode, setMode] = useState('trimmed')
  const [paddingMs, setPaddingMs] = useState(15)
  const [gapMs, setGapMs] = useState(0)
  const [status, setStatus] = useState('')
  const [measurements, setMeasurements] = useState<SegmentMeasurement[]>([])
  const [samples, setSamples] = useState<VoiceSample[]>([])

  useEffect(() => {
    const player = new QuestionVoicePlayer()
    playerRef.current = player
    const composed = new ComposedAudioPlayer()
    composedRef.current = composed
    setSamples(generateVoiceSamples())
    return () => { requestRef.current++; player.stop(); composed.dispose(); playerRef.current = null; composedRef.current = null }
  }, [])

  const stop = () => {
    requestRef.current++
    playerRef.current?.stop()
    composedRef.current?.stop()
    setStatus('')
  }

  const play = async (sample: VoiceSample) => {
    stop()
    setMeasurements([])
    if (mode === 'original') {
      playerRef.current?.playSequence(sample.sequence)
      setStatus('Đã chọn cách phát gốc: ' + sample.text)
      return
    }
    const request = requestRef.current
    setStatus('Đang chuẩn bị âm thanh…')
    try {
      const measurements = await composedRef.current!.play(sample.sequence, { paddingMs, gapMs }, () => {
        if (request === requestRef.current) setStatus('Đã phát xong: ' + sample.text)
      })
      if (request !== requestRef.current) return
      setMeasurements(measurements)
      setStatus('Đang phát: ' + sample.text)
    } catch (error) {
      if (request === requestRef.current) setStatus(error instanceof Error ? error.message : 'Không phát được âm thanh. Bấm loa để thử lại.')
    }
  }

  const regenerate = () => {
    stop()
    setMeasurements([])
    setSamples(generateVoiceSamples())
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl pb-20">
        <h1 className="text-2xl font-bold">Test voice ghép</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          20 câu ngẫu nhiên từ Toán lớp 2 · Bài 1, mỗi game 5 câu. Bấm loa để nghe từng câu ghép.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <label className="flex flex-col gap-2">Cách phát
            <select value={mode} onChange={event => { stop(); setMeasurements([]); setMode(event.target.value) }} className="rounded-lg border p-2">
              <option value="trimmed">Web Audio · Bỏ khoảng lặng</option>
              <option value="original">Bản gốc · Để so sánh</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">Giữ đệm đầu/cuối: {paddingMs} ms
            <input type="range" min="0" max="50" step="5" value={paddingMs} disabled={mode === 'original'} onChange={event => { stop(); setPaddingMs(Number(event.target.value)) }} />
          </label>
          <label className="flex flex-col gap-2">Nghỉ giữa đoạn: {gapMs} ms
            <input type="range" min="0" max="100" step="5" value={gapMs} disabled={mode === 'original'} onChange={event => { stop(); setGapMs(Number(event.target.value)) }} />
          </label>
          <p className="w-full text-xs leading-5 text-slate-500">Mặc định giữ đệm 15 ms, không thêm nhịp nghỉ. Nếu tiếng bị cụt, tăng đệm rồi bấm loa nghe lại. File MP3 gốc được giữ nguyên.</p>
        </div>
        <div className="my-5 flex flex-wrap gap-3">
          <button type="button" onClick={regenerate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
            <RefreshCw size={18} aria-hidden="true" /> Tạo 20 câu mới
          </button>
          <button type="button" onClick={stop} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-100">
            <Square size={16} aria-hidden="true" /> Dừng phát
          </button>
        </div>
        <p role="status" className="mb-4 text-sm text-sky-800">{status}</p>
        {measurements.length > 0 && <details className="mb-5 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
          <summary className="cursor-pointer">Khoảng lặng đã bỏ của câu vừa chọn</summary>
          <ul className="mt-2 space-y-1">{measurements.map((item, index) => <li key={index}>
            {item.text}: gốc {Math.round(item.durationMs)} ms · bỏ đầu {Math.round(item.trimmedStartMs)} ms · bỏ cuối {Math.round(item.trimmedEndMs)} ms
          </li>)}</ul>
        </details>}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full table-fixed text-left">
            <caption className="sr-only">Các câu voice ghép và nút nghe thử</caption>
            <thead className="bg-slate-100 text-sm">
              <tr><th scope="col" className="px-4 py-3">Text</th><th scope="col" className="w-24 px-3 py-3 text-center sm:w-32">Voice</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {samples.map((sample, index) => (
                <tr key={sample.id}>
                  <td className="break-words px-4 py-4">
                    <p className="mb-1 text-xs font-medium text-slate-500">{index + 1}. {GAME_NAMES[sample.game]}</p>
                    <p className="font-medium leading-7">{sample.text}</p>
                    <details className="mt-2 text-xs text-slate-500">
                      <summary className="cursor-pointer">{sample.sequence.length} đoạn ghép</summary>
                      <p className="mt-2 leading-6">{sample.sequence.map(segment => segment.text).join(' + ')}</p>
                    </details>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <button type="button" aria-label={`Nghe câu ${index + 1}: ${sample.text}`} onClick={() => void play(sample)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-sky-100 text-sky-800 hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
                      <Volume2 size={22} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
              {!samples.length && <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500" role="status">Đang tạo câu đọc…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
